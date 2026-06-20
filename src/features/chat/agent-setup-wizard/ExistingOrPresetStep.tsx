import { ChoiceRow, Panel } from "./components";
import type { ChoiceMode } from "./types";

export function ExistingOrPresetStep({
  title,
  mode,
  value,
  existing,
  fresh,
  onMode,
  onValue,
}: {
  title: string;
  mode: ChoiceMode;
  value: string;
  existing: string[];
  fresh: Array<{ key: string; label: string; description: string }>;
  onMode: (mode: ChoiceMode) => void;
  onValue: (value: string) => void;
}) {
  return (
    <Panel title={title}>
      <ChoiceRow
        mode={mode}
        value={value}
        existing={existing}
        fresh={fresh}
        onMode={onMode}
        onValue={onValue}
      />
    </Panel>
  );
}
