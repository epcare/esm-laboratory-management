import React, { ChangeEvent } from "react";
import { RadioButtonGroupProps } from "@carbon/react/lib/components/RadioButtonGroup/RadioButtonGroup";
import { Control, Controller, FieldValues } from "react-hook-form";
import { RadioButtonGroup, RadioButton } from "@carbon/react";
import { RadioOption } from "../../api/types/radio-option";

interface ControlledRadioButtonGroupProps<T> extends RadioButtonGroupProps {
  controllerName: string;
  defaultSelected?: any;
  name: string;
  control: Control<FieldValues, T>;
  options: RadioOption[]; // Change the type to RadioOption[]
  legendText?: string;
  invalid?: boolean;
  invalidText?: string;
  onChange: (
    selection: boolean | string | number,
    name?: string,
    event?: ChangeEvent<HTMLInputElement>
  ) => void;
}

const ControlledRadioButtonGroup = <T,>(
  props: ControlledRadioButtonGroupProps<T>
) => {
  return (
    <Controller
      name={props.controllerName}
      control={props.control}
      render={({ field: { onChange, value, ref } }) => (
        <RadioButtonGroup
          {...props}
          onChange={(
            selection: boolean,
            name: string,
            event: ChangeEvent<HTMLInputElement>
          ) => {
            onChange(selection, name, event);

            // Fire prop change
            if (props["onChange"]) {
              props["onChange"](selection, name, event);
            }
          }}
          id={props.name}
          ref={ref}
          defaultSelected={props.defaultSelected}
          value={value}
        >
          {props.options.map((option, index) => (
            <RadioButton
              key={`${index}-${props.name}-${option.value}`}
              id={`${props.name}-${option.value}`}
              labelText={option.label}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              ref={ref}
            />
          ))}
        </RadioButtonGroup>
      )}
    />
  );
};

export default ControlledRadioButtonGroup;
