import { describe, expect, it } from "vitest";
import {
  APP_COMMANDS,
  RUNTIME_COMMAND_TABS,
  SETTINGS_COMMAND_SECTIONS,
  appCommandFromPayload,
} from "./commands";

describe("app commands", () => {
  it("keeps New Chat as the primary workspace command", () => {
    expect(APP_COMMANDS.workspaceNewTask.label).toBe("New Chat");
    expect(appCommandFromPayload("workspace.newChat")).toBe(APP_COMMANDS.workspaceNewTask.id);
  });

  it("routes diagnostics commands to runtime tabs", () => {
    expect(RUNTIME_COMMAND_TABS[APP_COMMANDS.diagnosticsOpenLogs.id]).toBe("logs");
    expect(RUNTIME_COMMAND_TABS[APP_COMMANDS.diagnosticsOpenDoctor.id]).toBe("doctor");
    expect(RUNTIME_COMMAND_TABS[APP_COMMANDS.diagnosticsOpenDevices.id]).toBe("devices");
  });

  it("keeps settings commands scoped to configuration sections", () => {
    expect(SETTINGS_COMMAND_SECTIONS[APP_COMMANDS.settingsOpenToolsSkills.id]).toBe("tools-skills");
    expect(SETTINGS_COMMAND_SECTIONS[APP_COMMANDS.diagnosticsOpenLogs.id]).toBeUndefined();
  });
});
