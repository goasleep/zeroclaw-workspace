import { describe, expect, it } from "vitest";
import { joinRemoteRelPath, joinWorkspacePath, relativeWorkspacePath } from "./workspace";

describe("workspace path helpers", () => {
  it("joins remote relative paths without leading slashes", () => {
    expect(joinRemoteRelPath("", "src")).toBe("src");
    expect(joinRemoteRelPath("/repo/src/", "main.ts")).toBe("repo/src/main.ts");
  });

  it("joins workspace paths using the root separator", () => {
    expect(joinWorkspacePath("/repo", "src/main.ts")).toBe("/repo/src/main.ts");
    expect(joinWorkspacePath("C:\\repo", "src/main.ts")).toBe("C:\\repo\\src/main.ts");
  });

  it("computes workspace-relative paths for local and windows-style paths", () => {
    expect(relativeWorkspacePath("/repo", "/repo/src/main.ts")).toBe("src/main.ts");
    expect(relativeWorkspacePath("C:\\repo", "C:\\repo\\src\\main.ts")).toBe("src/main.ts");
  });
});
