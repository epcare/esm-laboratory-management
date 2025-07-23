import React, { ChangeEvent } from "react";
import { Control, Controller, FieldValues } from "react-hook-form";
import { NumberInput } from "@carbon/react";
import { TextInputProps } from "@carbon/react/lib/components/TextInput/TextInput";
import styles from "./controlled-number-input.scss";

interface ControlledNumberInputProps<T> extends TextInputProps {
  controllerName: string;
  id: string;
  name: string;
  control: Control<FieldValues, T>;
  readOnly?: boolean;
  maxLength?: number;
  size?: "sm" | "md" | "lg" | "xl";
  value?: string;
  labelText: string;
  invalid?: boolean;
  invalidText?: string;
  placeholder?: string;
  helperText?: string;
  type?: string;
  onChange?: (evt: ChangeEvent<HTMLInputElement>) => void;
  hideSteppers?: boolean;
  hideLabel?: boolean;
  defaultValue?: number;
  allowEmpty?: boolean;
  pattern?: string;
  step?: string;
}

const ControlledNumberInput = <T,>(props: ControlledNumberInputProps<T>) => {
  return (
    <Controller
      name={props.controllerName}
      control={props.control}
      render={({ field: { onChange, value, ref } }) => (
        <NumberInput
          {...props}
          label={props.labelText}
          id={props.name}
          className={styles.smallPlaceholderText}
          ref={ref}
          value={value}
          defaultValue={props.defaultValue}
          allowEmpty={props.allowEmpty}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            onChange(e.target.value);

            // Fire prop change
            if (props["onChange"]) {
              props["onChange"](e);
            }
          }}
        />
      )}
    />
  );
};

export default ControlledNumberInput;
