import React, { ChangeEvent } from "react";
import { Control, Controller, FieldValues } from "react-hook-form";
import { TextInput, Button } from "@carbon/react";
import { TextInputProps } from "@carbon/react/lib/components/TextInput/TextInput";
import { showNotification, showSnackbar } from "@openmrs/esm-framework";
import { Renew, Printer } from "@carbon/react/icons";
import { useTranslation } from "react-i18next";
import { extractErrorMessagesFromResponse } from "../../utils/functions";
import styles from "./controlled-accession-number.component.scss";
import {
  BarcodeGenerationAlgorithm,
  decodeEncodedBarcode,
  generateSpecimentBarCode,
} from "../../utils/barcode";
import { useLaboratoryConfig } from "../../hooks/useLaboratoryConfig";

interface ControlledAccessionNumberInputProps<T> extends TextInputProps {
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
  onChange?: (value: string | ChangeEvent<HTMLInputElement>) => void;
}

const ControlledAccessionNumber = <T,>(
  props: ControlledAccessionNumberInputProps<T>
) => {
  const { t } = useTranslation();
  const {
    laboratoryConfig: {
      enableSpecimenIdAutoGeneration,
      laboratoryBarcodePrintUri: laboratoryBarCodePrintUri,
      laboratoryBarcodeAlgorithm: laboratoryBarCodeAlgorithm,
      laboratoryBarcodeGenerateAndPrint: laboratoryBarCodeGenerateAndPrint,
      laboratoryBarcodeIdGenIdentifierSource:
        laboratoryBarCodeIdGenIdentifierSource,
    },
  } = useLaboratoryConfig();

  const handlePrint = (barcode: string) => {
    window.open(
      laboratoryBarCodePrintUri.replace("%BARCODE%", barcode),
      "_blank",
      "noreferrer"
    );
  };

  const generateId = async (e, callback) => {
    e.preventDefault();
    // generate sample Id
    generateSpecimentBarCode(
      laboratoryBarCodeAlgorithm as BarcodeGenerationAlgorithm,
      laboratoryBarCodeIdGenIdentifierSource
    ).then(
      (resp) => {
        callback(resp);
        showSnackbar({
          isLowContrast: true,
          title: t("generatesampleID", "Generate Sample Id"),
          kind: "success",
          subtitle: t(
            "generateSuccessfully",
            "You have successfully generated a Sample Id"
          ),
          autoClose: true,
        });
        if (laboratoryBarCodeGenerateAndPrint) {
          handlePrint(resp);
        }
      },
      (error) => {
        const errorMessages = extractErrorMessagesFromResponse(error);
        showNotification({
          title: t(`errorGeneratingId', 'Error Generating Sample Id`),
          kind: "error",
          critical: true,
          description: errorMessages.join(", "),
        });
      }
    );
  };

  return (
    <Controller
      name={props.controllerName}
      control={props.control}
      render={({ field: { onChange, value, ref } }) => {
        const barcodeTitle = decodeEncodedBarcode(value);
        return (
          <>
            <div className={styles.generateContainer}>
              <TextInput
                {...props}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  onChange(e.target.value);

                  // Fire prop change
                  if (props["onChange"]) {
                    props["onChange"](e.target.value);
                  }
                }}
                id={props.name}
                ref={ref}
                value={value}
                title={barcodeTitle ?? ""}
                readOnly={enableSpecimenIdAutoGeneration}
                hideReadOnly={false}
              />
              <Button
                className={styles.generateBtn}
                hasIconOnly
                onClick={(e) =>
                  generateId(e, (e: string) => {
                    onChange(e);

                    // Fire prop change
                    if (props["onChange"]) {
                      props["onChange"](e);
                    }
                  })
                }
                renderIcon={(props) => <Renew size={16} title="" {...props} />}
                disabled={false}
                title=""
              />
              {laboratoryBarCodePrintUri && value && (
                <Button
                  hasIconOnly
                  className={styles.generateBtn}
                  kind="ghost"
                  size="sm"
                  onClick={(e) => handlePrint(value)}
                  renderIcon={(props) => <Printer size={16} {...props} />}
                />
              )}
            </div>
            {props.invalid && (
              <div className={styles.errorText}>{props.invalidText}</div>
            )}
          </>
        );
      }}
    />
  );
};

export default ControlledAccessionNumber;
