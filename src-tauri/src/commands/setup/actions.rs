use std::time::Duration;

use tokio::process::Command;
use tokio::time;

use super::{
    SetupAction, SetupActionId, SetupActionResult, SetupCapabilityId, SetupCheck, SetupCheckStatus,
};

const ACTION_TIMEOUT: Duration = Duration::from_secs(180);

#[derive(Debug, Clone, Copy)]
pub(super) struct CommandSpec {
    pub(super) program: &'static str,
    pub(super) args: &'static [&'static str],
}

pub(super) fn allowlisted_action_command(
    action_id: SetupActionId,
    capability_id: SetupCapabilityId,
) -> Option<CommandSpec> {
    match (action_id, capability_id) {
        (SetupActionId::BrowserInstallAgentBrowser, SetupCapabilityId::BrowserAgentBrowser) => {
            Some(CommandSpec {
                program: "npm",
                args: &["install", "-g", "agent-browser"],
            })
        }
        (SetupActionId::BrowserInstallChromeForTesting, SetupCapabilityId::BrowserAgentBrowser) => {
            Some(CommandSpec {
                program: "agent-browser",
                args: &["install"],
            })
        }
        (SetupActionId::DockerPullAlpine, SetupCapabilityId::DockerRuntime) => Some(CommandSpec {
            program: "docker",
            args: &["pull", "alpine:3.20"],
        }),
        _ => None,
    }
}

pub(super) async fn run_action(spec: CommandSpec) -> Result<SetupActionResult, String> {
    let output = run_command(spec.program, spec.args, ACTION_TIMEOUT).await?;
    Ok(SetupActionResult {
        success: output.status.success(),
        exit_code: output.status.code(),
        stdout: String::from_utf8_lossy(&output.stdout).trim().to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).trim().to_string(),
    })
}

pub(super) async fn run_command(
    program: &str,
    args: &[&str],
    timeout: Duration,
) -> Result<std::process::Output, String> {
    let mut command = Command::new(program);
    command.args(args).kill_on_drop(true);
    time::timeout(timeout, command.output())
        .await
        .map_err(|_| format!("{program} timed out"))?
        .map_err(|e| format!("failed to run {program}: {e}"))
}

pub(super) fn setup_action(
    id: SetupActionId,
    label: &str,
    description: &str,
    command: &[&str],
) -> SetupAction {
    SetupAction {
        id,
        label: label.into(),
        description: description.into(),
        command: command.iter().map(|s| s.to_string()).collect(),
        requires_confirmation: true,
    }
}

pub(super) fn executable_check(program: &str, label: &str) -> SetupCheck {
    match which::which(program) {
        Ok(path) => SetupCheck {
            id: label.to_ascii_lowercase().replace(' ', "_"),
            label: label.into(),
            status: SetupCheckStatus::Pass,
            detail: path.to_string_lossy().to_string(),
        },
        Err(_) => SetupCheck {
            id: label.to_ascii_lowercase().replace(' ', "_"),
            label: label.into(),
            status: SetupCheckStatus::Fail,
            detail: format!("{program} was not found on PATH."),
        },
    }
}

pub(super) fn platform_node_install_commands() -> Vec<Vec<String>> {
    #[cfg(target_os = "macos")]
    return vec![vec!["brew".into(), "install".into(), "node".into()]];
    #[cfg(target_os = "linux")]
    return vec![vec![
        "install Node.js with your distribution package manager or from nodejs.org".into(),
    ]];
    #[cfg(target_os = "windows")]
    return vec![vec![
        "winget".into(),
        "install".into(),
        "OpenJS.NodeJS.LTS".into(),
    ]];
    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    vec![]
}

pub(super) fn platform_python_install_commands() -> Vec<Vec<String>> {
    #[cfg(target_os = "macos")]
    return vec![vec!["brew".into(), "install".into(), "python".into()]];
    #[cfg(target_os = "linux")]
    return vec![vec![
        "install python3 with your distribution package manager".into(),
    ]];
    #[cfg(target_os = "windows")]
    return vec![vec![
        "winget".into(),
        "install".into(),
        "Python.Python.3.12".into(),
    ]];
    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    vec![]
}

pub(super) fn platform_docker_install_commands() -> Vec<Vec<String>> {
    #[cfg(target_os = "macos")]
    return vec![vec![
        "brew".into(),
        "install".into(),
        "--cask".into(),
        "docker".into(),
    ]];
    #[cfg(target_os = "linux")]
    return vec![vec![
        "install Docker Engine using your distribution's official Docker docs".into(),
    ]];
    #[cfg(target_os = "windows")]
    return vec![vec![
        "winget".into(),
        "install".into(),
        "Docker.DockerDesktop".into(),
    ]];
    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    vec![]
}

pub(super) fn platform_sandbox_install_commands() -> Vec<Vec<String>> {
    #[cfg(target_os = "macos")]
    return vec![vec!["sandbox-exec".into(), "-h".into()]];
    #[cfg(target_os = "linux")]
    return vec![vec![
        "install bubblewrap, firejail, or Docker with your package manager".into(),
    ]];
    #[cfg(target_os = "windows")]
    return vec![vec![
        "Docker Desktop provides the recommended sandbox backend on Windows".into(),
    ]];
    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    vec![]
}

pub(super) fn first_non_empty_line(value: &str) -> Option<&str> {
    value.lines().map(str::trim).find(|line| !line.is_empty())
}
