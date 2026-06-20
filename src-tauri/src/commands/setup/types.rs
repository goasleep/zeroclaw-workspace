use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum SetupCapabilityId {
    BrowserAgentBrowser,
    PythonSkills,
    DockerRuntime,
    SandboxBackend,
    McpStdio,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum SetupActionId {
    BrowserInstallAgentBrowser,
    BrowserInstallChromeForTesting,
    DockerPullAlpine,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum SetupCheckStatus {
    Pass,
    Warn,
    Fail,
    Info,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum SetupOverallStatus {
    Ready,
    NeedsAction,
    Manual,
    Unavailable,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct SetupContext {
    pub capability_id: SetupCapabilityId,
    pub config_prefix: String,
    pub alias: Option<String>,
    pub mcp_transport: Option<String>,
    pub mcp_command: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct SetupActionRequest {
    pub action_id: SetupActionId,
    pub context: SetupContext,
}

#[derive(Debug, Clone, Serialize, specta::Type)]
pub struct SetupStatus {
    pub capability_id: SetupCapabilityId,
    pub title: String,
    pub summary: String,
    pub overall: SetupOverallStatus,
    pub checks: Vec<SetupCheck>,
    pub actions: Vec<SetupAction>,
    pub remediations: Vec<SetupRemediation>,
    pub config_recommendations: Vec<SetupConfigRecommendation>,
}

#[derive(Debug, Clone, Serialize, specta::Type)]
pub struct SetupCheck {
    pub id: String,
    pub label: String,
    pub status: SetupCheckStatus,
    pub detail: String,
}

#[derive(Debug, Clone, Serialize, specta::Type)]
pub struct SetupAction {
    pub id: SetupActionId,
    pub label: String,
    pub description: String,
    pub command: Vec<String>,
    pub requires_confirmation: bool,
}

#[derive(Debug, Clone, Serialize, specta::Type)]
pub struct SetupRemediation {
    pub title: String,
    pub body: String,
    pub commands: Vec<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, specta::Type)]
pub struct SetupConfigRecommendation {
    pub id: String,
    pub label: String,
    pub description: String,
    pub path: String,
    pub value: SetupConfigValue,
    pub merge: Option<String>,
}

#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(tag = "type", content = "value", rename_all = "snake_case")]
pub enum SetupConfigValue {
    Bool(bool),
    String(String),
    StringArray(Vec<String>),
}

#[derive(Debug, Clone, Serialize, specta::Type)]
pub struct SetupActionResult {
    pub success: bool,
    pub exit_code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
}
