import { useLingui } from "@lingui/react/macro";
import { Select } from "@/ui/select";

export interface ConfiguredModelChoice {
  value: string;
  model?: string;
}

export const MODEL_FOLLOWS_AGENT = "__agent__";

export function ModelOverrideSelect({
  value,
  choices,
  onChange,
}: {
  value: string;
  choices: ConfiguredModelChoice[];
  onChange: (value: string) => void;
}) {
  const { t } = useLingui();
  const options = [
    { value: MODEL_FOLLOWS_AGENT, label: t`Agent default` },
    ...choices.map((choice) => ({
      value: choice.value,
      label: choice.model ? `${choice.value} · ${choice.model}` : choice.value,
    })),
  ];
  return (
    <Select
      value={value}
      options={options}
      onValueChange={onChange}
      placeholder={t`Model`}
      className="h-7 max-w-64 border-white/10 bg-white/[0.04] py-0 text-[10px]"
    />
  );
}
