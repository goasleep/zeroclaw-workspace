//! Background task status projection from ZeroClaw runtime state.
//!
//! Studio owns task shells and labels, but execution state belongs to the
//! active ZeroClaw gateway. This observer keeps the local task status cache in
//! sync without depending on a React page being mounted.

use crate::connection::Connection;
use crate::connection::store::SharedConnectionBook;
use crate::workspace::task_state::{
    SharedTaskStateStore, StudioTask, TaskStatus, TaskStatusProjection,
};
use anyhow::{Context, Result, anyhow};
use futures_util::StreamExt;
use serde::Serialize;
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Runtime};

const POLL_INTERVAL: Duration = Duration::from_secs(5);
const RETRY_INTERVAL: Duration = Duration::from_secs(5);
const REQUEST_TIMEOUT: Duration = Duration::from_secs(8);
pub const TASKS_UPDATED_EVENT: &str = "zeroclaw://tasks-updated";

#[derive(Debug, Clone, Serialize)]
pub struct TasksUpdatedEvent {
    pub connection_id: String,
    pub tasks: Vec<StudioTask>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct Projection {
    status: TaskStatus,
    last_activity_at: Option<String>,
}

#[derive(Debug, Clone, Default)]
struct RunningSessions {
    ids: HashSet<String>,
    available: bool,
}

#[derive(Debug, Clone)]
struct GatewayTaskClient {
    base_url: String,
    token: Option<String>,
    client: reqwest::Client,
}

pub fn spawn_task_observer<R: Runtime + 'static>(
    app: AppHandle<R>,
    book: SharedConnectionBook,
    store: SharedTaskStateStore,
    http_client: reqwest::Client,
) {
    let poll_app = app.clone();
    let poll_book = book.clone();
    let poll_store = store.clone();
    let poll_client = http_client.clone();
    tauri::async_runtime::spawn(async move {
        loop {
            if let Some(conn) = poll_book.active().await
                && let Err(err) =
                    reconcile_connection(&poll_app, &poll_store, &poll_client, &conn).await
            {
                log::debug!("[task-observer] reconcile failed: {err}");
            }
            tokio::time::sleep(POLL_INTERVAL).await;
        }
    });

    tauri::async_runtime::spawn(async move {
        run_event_loop(app, book, store, http_client).await;
    });
}

async fn run_event_loop<R: Runtime + 'static>(
    app: AppHandle<R>,
    book: SharedConnectionBook,
    store: SharedTaskStateStore,
    http_client: reqwest::Client,
) {
    loop {
        let Some(conn) = book.active().await else {
            tokio::time::sleep(RETRY_INTERVAL).await;
            continue;
        };
        if conn.url.trim().is_empty() {
            tokio::time::sleep(RETRY_INTERVAL).await;
            continue;
        }

        if let Err(err) =
            stream_runtime_events(&app, &book, &store, &http_client, conn.clone()).await
        {
            log::debug!("[task-observer] event stream ended: {err}");
        }
        tokio::time::sleep(RETRY_INTERVAL).await;
    }
}

async fn stream_runtime_events<R: Runtime + 'static>(
    app: &AppHandle<R>,
    book: &SharedConnectionBook,
    store: &SharedTaskStateStore,
    http_client: &reqwest::Client,
    conn: Connection,
) -> Result<()> {
    let client = GatewayTaskClient::new(&conn, http_client.clone());
    let response = client
        .event_stream_request("/api/events")
        .send()
        .await
        .context("open event stream")?;
    if !response.status().is_success() {
        return Err(anyhow!("event stream returned {}", response.status()));
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();
    loop {
        tokio::select! {
            maybe = stream.next() => {
                let Some(chunk) = maybe else {
                    break;
                };
                let chunk = chunk.context("read event stream")?;
                buffer.push_str(&String::from_utf8_lossy(&chunk));
                while let Some(pos) = buffer.find('\n') {
                    let line = buffer[..pos].trim().to_string();
                    buffer = buffer[pos + 1..].to_string();
                    if let Some(data) = line.strip_prefix("data:")
                        && event_should_reconcile(data.trim())
                    {
                        reconcile_connection(app, store, http_client, &conn).await?;
                    }
                }
            }
            _ = tokio::time::sleep(POLL_INTERVAL) => {
                let active = book.active().await;
                if active.as_ref().map(|active| active.id) != Some(conn.id) {
                    break;
                }
            }
        }
    }
    Ok(())
}

async fn reconcile_connection<R: Runtime + 'static>(
    app: &AppHandle<R>,
    store: &SharedTaskStateStore,
    http_client: &reqwest::Client,
    conn: &Connection,
) -> Result<()> {
    if conn.url.trim().is_empty() {
        return Ok(());
    }
    let connection_id = conn.id.to_string();
    let tasks = store.observer_candidates(&connection_id).await?;
    if tasks.is_empty() {
        return Ok(());
    }

    let gateway = GatewayTaskClient::new(conn, http_client.clone());
    let projections = build_projections(&gateway, &tasks).await;
    if projections.is_empty() {
        return Ok(());
    }

    let changed = store
        .apply_status_projections(&connection_id, projections)
        .await?;
    if changed.is_empty() {
        return Ok(());
    }

    store.save(app).await?;
    let _ = app.emit(
        TASKS_UPDATED_EVENT,
        TasksUpdatedEvent {
            connection_id,
            tasks: changed,
        },
    );
    Ok(())
}

async fn build_projections(
    gateway: &GatewayTaskClient,
    tasks: &[StudioTask],
) -> Vec<TaskStatusProjection> {
    let session_tasks = tasks
        .iter()
        .filter(|task| task.session_id.is_some())
        .collect::<Vec<_>>();
    let cron_tasks = tasks
        .iter()
        .filter(|task| task.cron_job_id.is_some())
        .collect::<Vec<_>>();
    let running_sessions = if session_tasks.is_empty() {
        RunningSessions::default()
    } else {
        gateway.running_sessions().await.unwrap_or_default()
    };
    let cron_jobs = if cron_tasks.is_empty() {
        HashMap::new()
    } else {
        gateway.cron_jobs().await.unwrap_or_default()
    };

    let mut projections = Vec::new();
    for task in tasks {
        let projection = if let Some(session_id) = task.session_id.as_deref() {
            reconcile_session(gateway, task, session_id, &running_sessions).await
        } else if let Some(cron_job_id) = task.cron_job_id.as_deref() {
            reconcile_cron(gateway, cron_job_id, &cron_jobs).await
        } else {
            None
        };

        if let Some(projection) = projection {
            projections.push(TaskStatusProjection {
                task_id: task.id.clone(),
                status: projection.status,
                last_activity_at: projection.last_activity_at,
            });
        }
    }
    projections
}

async fn reconcile_session(
    gateway: &GatewayTaskClient,
    task: &StudioTask,
    session_id: &str,
    running_sessions: &RunningSessions,
) -> Option<Projection> {
    if running_sessions.available && running_sessions.ids.contains(session_id) {
        return Some(Projection {
            status: TaskStatus::Running,
            last_activity_at: None,
        });
    }

    if let Ok(Some(projection)) = gateway.session_state(session_id).await {
        return Some(projection);
    }

    if running_sessions.available
        && matches!(task.status, TaskStatus::Running | TaskStatus::NeedsApproval)
        && let Ok(Some(projection)) = gateway.session_messages_projection(session_id).await
    {
        return Some(projection);
    }

    None
}

async fn reconcile_cron(
    gateway: &GatewayTaskClient,
    cron_job_id: &str,
    cron_jobs: &HashMap<String, Value>,
) -> Option<Projection> {
    let Some(job) = cron_jobs.get(cron_job_id) else {
        return Some(Projection {
            status: TaskStatus::Failed,
            last_activity_at: None,
        });
    };
    if let Ok(Some(projection)) = gateway.cron_latest_run_projection(cron_job_id).await {
        return Some(projection);
    }
    cron_job_projection(job)
}

impl GatewayTaskClient {
    fn new(conn: &Connection, client: reqwest::Client) -> Self {
        Self {
            base_url: conn.url.trim_end_matches('/').to_string(),
            token: conn.auth.token.clone(),
            client,
        }
    }

    fn request(&self, method: reqwest::Method, path: &str) -> reqwest::RequestBuilder {
        let url = format!("{}{}", self.base_url, path);
        let mut request = self.client.request(method, url).timeout(REQUEST_TIMEOUT);
        if let Some(token) = self.token.as_deref() {
            request = request.header("Authorization", format!("Bearer {token}"));
        }
        request
    }

    fn event_stream_request(&self, path: &str) -> reqwest::RequestBuilder {
        let url = format!("{}{}", self.base_url, path);
        let mut request = self.client.get(url);
        if let Some(token) = self.token.as_deref() {
            request = request.header("Authorization", format!("Bearer {token}"));
        }
        request
    }

    async fn get_json(&self, path: &str) -> Result<Value> {
        let response = self
            .request(reqwest::Method::GET, path)
            .send()
            .await
            .with_context(|| format!("GET {path}"))?;
        if !response.status().is_success() {
            return Err(anyhow!("GET {path} returned {}", response.status()));
        }
        response
            .json::<Value>()
            .await
            .with_context(|| format!("parse {path}"))
    }

    async fn running_sessions(&self) -> Result<RunningSessions> {
        let value = self.get_json("/api/sessions/running").await?;
        Ok(RunningSessions {
            ids: parse_running_session_ids(&value),
            available: true,
        })
    }

    async fn session_state(&self, session_id: &str) -> Result<Option<Projection>> {
        let value = self
            .get_json(&format!(
                "/api/sessions/{}/state",
                url_encode_segment(session_id)
            ))
            .await?;
        Ok(session_state_projection(&value))
    }

    async fn session_messages_projection(&self, session_id: &str) -> Result<Option<Projection>> {
        let value = self
            .get_json(&format!(
                "/api/sessions/{}/messages",
                url_encode_segment(session_id)
            ))
            .await?;
        Ok(session_messages_projection(&value))
    }

    async fn cron_jobs(&self) -> Result<HashMap<String, Value>> {
        let value = self.get_json("/api/cron").await?;
        let jobs = value
            .get("jobs")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();
        Ok(jobs
            .into_iter()
            .filter_map(|job| Some((json_string_field(&job, &["id", "job_id"])?, job)))
            .collect())
    }

    async fn cron_latest_run_projection(&self, cron_job_id: &str) -> Result<Option<Projection>> {
        let value = self
            .get_json(&format!(
                "/api/cron/{}/runs?limit=1",
                url_encode_segment(cron_job_id)
            ))
            .await?;
        let Some(run) = value
            .get("runs")
            .and_then(Value::as_array)
            .and_then(|runs| runs.first())
        else {
            return Ok(None);
        };
        Ok(cron_run_projection(run))
    }
}

fn event_should_reconcile(data: &str) -> bool {
    let Ok(value) = serde_json::from_str::<Value>(data) else {
        return false;
    };
    let Some(kind) = value.get("type").and_then(Value::as_str) else {
        return false;
    };
    matches!(
        kind,
        "agent_start" | "agent_end" | "cron_result" | "error" | "approval_request"
    )
}

fn parse_running_session_ids(value: &Value) -> HashSet<String> {
    let mut out = HashSet::new();
    collect_session_ids(value, &mut out);
    out
}

fn collect_session_ids(value: &Value, out: &mut HashSet<String>) {
    match value {
        Value::Array(items) => {
            for item in items {
                collect_session_ids(item, out);
            }
        }
        Value::Object(map) => {
            for key in ["session_id", "id"] {
                if let Some(id) = map.get(key).and_then(Value::as_str)
                    && !id.trim().is_empty()
                {
                    out.insert(id.to_string());
                }
            }
            for key in ["sessions", "running", "items"] {
                if let Some(nested) = map.get(key) {
                    collect_session_ids(nested, out);
                }
            }
        }
        _ => {}
    }
}

fn session_state_projection(value: &Value) -> Option<Projection> {
    if has_pending_approval(value) {
        return Some(Projection {
            status: TaskStatus::NeedsApproval,
            last_activity_at: json_activity_time(value),
        });
    }

    status_from_json(value, StatusDomain::Session).map(|status| Projection {
        status,
        last_activity_at: json_activity_time(value),
    })
}

fn session_messages_projection(value: &Value) -> Option<Projection> {
    let messages = value.get("messages").and_then(Value::as_array)?;
    if messages.is_empty() {
        return None;
    }
    Some(Projection {
        status: TaskStatus::Done,
        last_activity_at: messages.last().and_then(json_activity_time),
    })
}

fn cron_job_projection(job: &Value) -> Option<Projection> {
    status_from_json(job, StatusDomain::Cron).map(|status| Projection {
        status,
        last_activity_at: json_activity_time(job),
    })
}

fn cron_run_projection(run: &Value) -> Option<Projection> {
    status_from_json(run, StatusDomain::Cron).map(|status| Projection {
        status,
        last_activity_at: json_activity_time(run),
    })
}

#[derive(Debug, Clone, Copy)]
enum StatusDomain {
    Session,
    Cron,
}

fn status_from_json(value: &Value, domain: StatusDomain) -> Option<TaskStatus> {
    let mut statuses = Vec::new();
    collect_status_strings(value, &mut statuses);
    statuses
        .into_iter()
        .find_map(|status| map_runtime_status(&status, domain))
}

fn collect_status_strings(value: &Value, out: &mut Vec<String>) {
    match value {
        Value::Object(map) => {
            for (key, value) in map {
                if matches!(
                    key.as_str(),
                    "status" | "state" | "phase" | "last_status" | "run_status"
                ) && let Some(status) = value.as_str()
                {
                    out.push(status.to_string());
                }
                collect_status_strings(value, out);
            }
        }
        Value::Array(items) => {
            for item in items {
                collect_status_strings(item, out);
            }
        }
        _ => {}
    }
}

fn map_runtime_status(raw: &str, domain: StatusDomain) -> Option<TaskStatus> {
    let normalized = raw.trim().to_ascii_lowercase().replace('-', "_");
    match normalized.as_str() {
        "needs_approval" | "approval_required" | "awaiting_approval" | "pending_approval" => {
            Some(TaskStatus::NeedsApproval)
        }
        "running" | "pending" | "streaming" | "active" | "started" | "in_progress" => {
            Some(TaskStatus::Running)
        }
        "done" | "complete" | "completed" | "success" | "succeeded" | "ok" => {
            Some(TaskStatus::Done)
        }
        "failed" | "failure" | "error" | "errored" | "aborted" | "cancelled" | "canceled" => {
            Some(TaskStatus::Failed)
        }
        "degraded" if matches!(domain, StatusDomain::Cron) => Some(TaskStatus::Failed),
        _ => None,
    }
}

fn has_pending_approval(value: &Value) -> bool {
    match value {
        Value::Object(map) => {
            for (key, value) in map {
                let key = key.to_ascii_lowercase();
                if key.contains("approval") && approval_value_is_pending(value) {
                    return true;
                }
                if has_pending_approval(value) {
                    return true;
                }
            }
            false
        }
        Value::Array(items) => items.iter().any(has_pending_approval),
        _ => false,
    }
}

fn approval_value_is_pending(value: &Value) -> bool {
    match value {
        Value::Bool(value) => *value,
        Value::String(value) => matches!(
            value.trim().to_ascii_lowercase().as_str(),
            "pending" | "requested" | "required" | "needs_approval" | "awaiting_approval"
        ),
        Value::Object(map) => {
            if let Some(status) = map.get("status").and_then(Value::as_str) {
                return matches!(
                    status.trim().to_ascii_lowercase().as_str(),
                    "pending" | "requested" | "required" | "needs_approval" | "awaiting_approval"
                );
            }
            !map.contains_key("response")
        }
        Value::Array(items) => items.iter().any(approval_value_is_pending),
        _ => false,
    }
}

fn json_activity_time(value: &Value) -> Option<String> {
    for key in [
        "last_activity_at",
        "last_message_at",
        "updated_at",
        "finished_at",
        "started_at",
        "timestamp",
        "created_at",
        "last_run",
    ] {
        if let Some(value) = json_string_field(value, &[key]) {
            return Some(value);
        }
    }
    None
}

fn json_string_field(value: &Value, keys: &[&str]) -> Option<String> {
    let map = value.as_object()?;
    keys.iter()
        .find_map(|key| map.get(*key).and_then(Value::as_str))
        .filter(|value| !value.trim().is_empty())
        .map(str::to_string)
}

fn url_encode_segment(segment: &str) -> String {
    url::form_urlencoded::byte_serialize(segment.as_bytes()).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn maps_chat_state_json_to_task_status() {
        assert_eq!(
            session_state_projection(&json!({ "status": "running" }))
                .unwrap()
                .status,
            TaskStatus::Running
        );
        assert_eq!(
            session_state_projection(&json!({ "approval": { "request_id": "a1" } }))
                .unwrap()
                .status,
            TaskStatus::NeedsApproval
        );
        assert_eq!(
            session_state_projection(&json!({ "state": "completed" }))
                .unwrap()
                .status,
            TaskStatus::Done
        );
        assert_eq!(
            session_state_projection(&json!({ "phase": "aborted" }))
                .unwrap()
                .status,
            TaskStatus::Failed
        );
    }

    #[test]
    fn maps_cron_job_and_latest_run_status() {
        assert_eq!(
            cron_run_projection(&json!({ "status": "pending" }))
                .unwrap()
                .status,
            TaskStatus::Running
        );
        assert_eq!(
            cron_run_projection(&json!({ "status": "success" }))
                .unwrap()
                .status,
            TaskStatus::Done
        );
        assert_eq!(
            cron_run_projection(&json!({ "status": "degraded" }))
                .unwrap()
                .status,
            TaskStatus::Failed
        );
        assert_eq!(
            cron_job_projection(&json!({ "last_status": "error" }))
                .unwrap()
                .status,
            TaskStatus::Failed
        );
    }

    #[tokio::test]
    async fn missing_cron_job_maps_to_failed() {
        let gateway = GatewayTaskClient {
            base_url: "http://127.0.0.1:1".into(),
            token: None,
            client: reqwest::Client::new(),
        };
        let projection = reconcile_cron(&gateway, "missing", &HashMap::new())
            .await
            .unwrap();

        assert_eq!(projection.status, TaskStatus::Failed);
    }

    #[tokio::test]
    async fn observer_store_update_skips_archived_and_untracked_drafts() {
        let store = crate::workspace::task_state::TaskStateStore::new();
        let mut running = task("running", TaskStatus::Running);
        running.session_id = Some("s1".into());
        store.upsert(running).await.unwrap();
        let mut archived = task("archived", TaskStatus::Archived);
        archived.session_id = Some("s2".into());
        store.upsert(archived).await.unwrap();
        store
            .upsert(task("draft", TaskStatus::Draft))
            .await
            .unwrap();

        let candidates = store.observer_candidates("conn").await.unwrap();
        assert_eq!(
            candidates
                .iter()
                .map(|task| task.id.as_str())
                .collect::<Vec<_>>(),
            vec!["running"]
        );

        let changed = store
            .apply_status_projections(
                "conn",
                vec![
                    TaskStatusProjection {
                        task_id: "running".into(),
                        status: TaskStatus::Done,
                        last_activity_at: Some("2026-01-02T00:00:00Z".into()),
                    },
                    TaskStatusProjection {
                        task_id: "archived".into(),
                        status: TaskStatus::Done,
                        last_activity_at: None,
                    },
                ],
            )
            .await
            .unwrap();

        assert_eq!(changed.len(), 1);
        assert_eq!(changed[0].id, "running");
        let tasks = store.list("conn").await.unwrap();
        assert_eq!(
            tasks
                .iter()
                .find(|task| task.id == "archived")
                .unwrap()
                .status,
            TaskStatus::Archived
        );
    }

    #[test]
    fn unknown_or_unavailable_shapes_do_not_force_terminal_status() {
        assert!(session_state_projection(&json!({ "phase": "mystery" })).is_none());
        assert!(cron_run_projection(&json!({ "status": "active_idle" })).is_none());
        assert!(session_messages_projection(&json!({ "messages": [] })).is_none());
    }

    fn task(id: &str, status: TaskStatus) -> StudioTask {
        StudioTask {
            id: id.to_string(),
            connection_id: "conn".into(),
            title: id.into(),
            goal: None,
            session_id: None,
            cron_job_id: None,
            workspace_root: None,
            agent_alias: None,
            mode: crate::workspace::task_state::TaskMode::Chat,
            status,
            tags: Vec::new(),
            pinned_result: None,
            created_at: "2026-01-01T00:00:00Z".into(),
            updated_at: "2026-01-01T00:00:00Z".into(),
            last_activity_at: None,
            archived_at: None,
        }
    }
}
