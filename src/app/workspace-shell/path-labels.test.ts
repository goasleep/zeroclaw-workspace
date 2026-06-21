import { describe, expect, it } from "vitest";
import { workspacePathLabel } from "./path-labels";

describe("workspacePathLabel", () => {
  it("uses the final path segment for unix paths", () => {
    expect(workspacePathLabel("/Users/fengpeng/Project/opensource/firecracker")).toBe("firecracker");
  });

  it("ignores trailing path separators", () => {
    expect(workspacePathLabel("/Users/fengpeng/Project/opensource/firecracker/")).toBe("firecracker");
  });

  it("uses the final path segment for windows paths", () => {
    expect(workspacePathLabel("C:\\Users\\fengpeng\\Project\\firecracker")).toBe("firecracker");
  });

  it("keeps root-only paths readable", () => {
    expect(workspacePathLabel("/")).toBe("/");
  });
});
