import React, { ChangeEvent } from "react";
import { Control, Controller, FieldValues } from "react-hook-form";
import { TextInput } from "@carbon/react";
import { TextInputProps } from "@carbon/react/lib/components/TextInput/TextInput";

interface ControlledTextInputProps<T> extends TextInputProps {
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
}

const ControlledTextInput = <T,>(props: ControlledTextInputProps<T>) => {
  return (
    <Controller
      name={props.controllerName}
      control={props.control}
      render={({ field: { onChange, value, ref } }) => (
        <TextInput
          {...props}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            onChange(e.target.value);

            // Fire prop change
            if (props["onChange"]) {
              props["onChange"](e);
            }
          }}
          id={props.name}
          ref={ref}
          value={value}
        />
      )}
    />
  );
};

export default ControlledTextInput;
