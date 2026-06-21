import { describe, expect, it } from "vitest";
import { normalizeSettingsSection, settingsSectionForConfigTarget } from "./settings-routing";

describe("settings routing", () => {
  it("routes runtime operation sections away from settings", () => {
    expect(normalizeSettingsSection("automations")).toBe("gateway-overview");
    expect(normalizeSettingsSection("cron")).toBe("gateway-overview");
    expect(normalizeSettingsSection("logs")).toBe("gateway-overview");
    expect(normalizeSettingsSection("doctor")).toBe("gateway-overview");
    expect(normalizeSettingsSection("devices")).toBe("gateway-overview");
    expect(settingsSectionForConfigTarget("cron")).toBe("gateway-overview");
    expect(settingsSectionForConfigTarget("cron.jobs")).toBe("gateway-overview");
  });
});
