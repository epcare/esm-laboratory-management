import React, { ChangeEvent } from "react";
import { Control, Controller, FieldValues } from "react-hook-form";
import { TextAreaProps } from "@carbon/react/lib/components/TextArea/TextArea";
import { TextArea } from "@carbon/react";

interface ControlledTextAreaProps<T> extends TextAreaProps {
  controllerName: string;
  name: string;
  control: Control<FieldValues, T>;
  id?: string;
  maxLength: number;
  value?: string;
  labelText: string;
  invalid?: boolean;
  invalidText?: string;
  placeholder?: string;
  helperText?: string;
  rows?: number;
}

const ControlledTextArea = <T,>(props: ControlledTextAreaProps<T>) => {
  return (
    <Controller
      name={props.controllerName}
      control={props.control}
      render={({ field: { onChange, value, ref } }) => (
        <TextArea
          {...props}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
            onChange(e.target.value);

            // Fire prop change
            if (props["onChange"]) {
              props["onChange"](e);
            }
          }}
          ref={ref}
          value={value}
          id={props?.id}
        />
      )}
    />
  );
};

export default ControlledTextArea;
