"use client";

import { Description, FieldError, Label, ListBox, Select } from "@heroui/react";
import { adminStyles } from "./admin-styles";

type SelectOption = { value: string; label: string };

function optionKey(value: string) {
  return `option:${value}`;
}

export default function AdminSelect({
  label,
  name,
  options,
  value,
  onChange,
  placeholder,
  description,
  error,
  isRequired,
  isDisabled,
}: {
  label: string;
  name?: string;
  options: readonly SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  description?: string;
  error?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
}) {
  const selected = options.find((option) => option.value === value);

  return (
    <Select
      className={adminStyles.field}
      fullWidth
      value={selected ? optionKey(selected.value) : null}
      onChange={(key) => {
        const option = options.find(({ value }) => optionKey(value) === key);
        if (option) onChange(option.value);
      }}
      placeholder={placeholder}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isInvalid={Boolean(error)}
    >
      {/* Keep the original form value, including an empty string for the top-level topic. */}
      {name && <input type="hidden" name={name} value={selected?.value ?? ""} disabled={isDisabled} />}
      <Label>{label}</Label>
      <Select.Trigger className="min-h-10 min-w-0 gap-2 border border-kb-line bg-kb-panel [&>*]:pointer-events-none">
        <Select.Value className="min-w-0 whitespace-normal wrap-anywhere">{selected?.label}</Select.Value>
        <Select.Indicator className="shrink-0" />
      </Select.Trigger>
      <Select.Popover className="w-(--trigger-width)">
        <ListBox className="max-h-60 overflow-y-auto">
          {options.map(({ value, label }) => (
            <ListBox.Item key={optionKey(value)} id={optionKey(value)} textValue={label}>
              <span className="min-w-0 flex-1 whitespace-normal wrap-anywhere">{label}</span>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
      {description && <Description>{description}</Description>}
      {error && <FieldError>{error}</FieldError>}
    </Select>
  );
}
