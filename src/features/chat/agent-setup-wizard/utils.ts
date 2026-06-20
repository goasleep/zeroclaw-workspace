export function splitList(value: string) {
  return value
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatErrors(errors: Array<{ step: string; field: string; message: string }>) {
  return errors.map((e) => `${e.step}${e.field ? `.${e.field}` : ""}: ${e.message}`).join("; ");
}

export function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}
