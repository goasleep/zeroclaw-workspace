export function workspacePathLabel(path: string) {
  const trimmed = path.trim();
  const withoutTrailingSeparators = trimmed.replace(/[\\/]+$/g, "");
  const target = withoutTrailingSeparators || trimmed;
  const segments = target.split(/[\\/]/).filter(Boolean);

  return segments.at(-1) ?? target;
}
