import React, { ChangeEvent, useState } from "react";
import styles from "./import-test-results-dialog.component.scss";
import {
  Button,
  ModalBody,
  ModalFooter,
  ModalHeader,
  InlineLoading,
  Select,
  SelectItem,
} from "@carbon/react";
import { useTranslation } from "react-i18next";
import { createTestImportConfig } from "../../api/test-import-config.resource";
import {
  TestResultImportConceptMapping,
  TestResultImportConfig,
  TestResultImportConfigMapping,
  TestResultImportConfigMappingHeaders,
} from "../../api/types/test-result-import-config";
import { showNotification, showSnackbar } from "@openmrs/esm-framework";
import { extractErrorMessagesFromResponse } from "../../utils/functions";
import {
  TestResultImportConfigFieldsSchema,
  TestResultImportConfigFormData,
} from "./import-test-result-config.validation-schema";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import {
  isCoded,
  isNumericConcept,
  isPanel,
  isTextOrNumeric,
  ResultField,
} from "../../results/result-field";
import { zodResolver } from "@hookform/resolvers/zod";
import TestResultImportConfigFormField from "../../results/test-result-import-config-form-field.component";

interface ImportTestResultsConfigProps {
  closeModal: () => void;
  testResultImportConfig: TestResultImportConfig;
  csvFields: TestResultImportConfigMapping;
  loadTestResults: (
    mapping: TestResultImportConceptMapping,
    headers: Array<TestResultImportConfigMappingHeaders>,
    sampleIdField: string,
    rows: Array<Array<string>>
  ) => string;
}

const ImportTestResultsConfig: React.FC<ImportTestResultsConfigProps> = ({
  testResultImportConfig,
  closeModal,
  csvFields,
  loadTestResults: loadWorkSheetTestResults,
}) => {
  const { t } = useTranslation();
  const [isBusy, setIsBusy] = useState(false);

  const {
    control,
    register,
    formState: { isSubmitting, errors },
    getValues,
    handleSubmit,
    setFocus,
    setValue,
  } = useForm<TestResultImportConfigFormData>({
    defaultValues: {
      sampleId: csvFields?.sampleId,
      fields: [testResultImportConfig].map((p) => {
        let mapping =
          csvFields?.mapping?.concept == p.test.uuid ? csvFields.mapping : null;
        let resultField: ResultField = {
          id: p.uuid,
          concept: p.test,
          isCoded: isCoded(p.test),
          isPanel: isPanel(p.test),
          isTextOrNumeric: isTextOrNumeric(p.test),
          conceptUuid: p.test.uuid,
          isNumeric: isNumericConcept(p.test),
          minValue: null,
          maxValue: null,
          allowDecimals: true,
          display: p.test.display,
          orderUuid: "",
        };

        if (resultField.isNumeric) {
          resultField.minValue = p.test?.lowAbsolute;
          resultField.maxValue = p.test?.hiAbsolute;
          resultField.allowDecimals = p.test?.allowDecimal ?? true;
        }

        if (resultField.isTextOrNumeric || resultField.isCoded) {
          let fieldMapping = mapping;
          resultField.value = fieldMapping?.value ?? "";
          if (resultField.isNumeric) {
            resultField.scale = fieldMapping?.scale
              ? fieldMapping?.scale + ""
              : "";
          }
        }

        if (resultField.isCoded) {
          resultField.answers = p.test.answers.map((x, memberIndex) => {
            let answerFieldMember: ResultField = {
              id: `${p.uuid}-a-${memberIndex}`,
              concept: x,
              isCoded: false,
              isPanel: false,
              isTextOrNumeric: true,
              orderUuid: "",
              conceptUuid: x.uuid,
              display: x.display,
              isNumeric: false,
              minValue: null,
              maxValue: null,
              allowDecimals: false,
            };
            let answerfieldMapping = mapping?.answers?.find(
              (y) => y.concept == x.uuid
            );
            answerFieldMember.value = answerfieldMapping?.value ?? "";
            return answerFieldMember;
          });
        }

        if (resultField.isPanel) {
          resultField.setMembers = p.test.setMembers.map((x, memberIndex) => {
            let fieldMapping = mapping?.setMembers?.find(
              (p) => p.concept == x.uuid
            );
            let resultFieldMember: ResultField = {
              id: `${p.uuid}-${memberIndex}`,
              worksheetItem: p,
              worksheetItemUuid: p.uuid,
              concept: x,
              isCoded: isCoded(x),
              isPanel: isPanel(x),
              isTextOrNumeric: isTextOrNumeric(x),
              orderUuid: "",
              conceptUuid: x.uuid,
              display: x.display,
              isNumeric: isNumericConcept(x),
              minValue: null,
              maxValue: null,
              allowDecimals: true,
            };
            if (resultFieldMember.isNumeric) {
              resultFieldMember.minValue = x?.lowAbsolute;
              resultFieldMember.maxValue = x?.hiAbsolute;
              resultFieldMember.allowDecimals = x?.allowDecimal ?? true;
            }

            if (
              resultFieldMember.isTextOrNumeric ||
              resultFieldMember.isCoded
            ) {
              resultFieldMember.value = fieldMapping?.value ?? "";
              if (resultFieldMember.isNumeric) {
                resultFieldMember.scale = fieldMapping?.scale
                  ? fieldMapping?.scale + ""
                  : "";
              }
            }
            if (resultFieldMember.isCoded) {
              resultFieldMember.answers = x?.answers.map((z, memberIndex) => {
                let answerFieldMember: ResultField = {
                  id: `${p.uuid}-a-${memberIndex}`,
                  concept: z,
                  isCoded: false,
                  isPanel: false,
                  isTextOrNumeric: true,
                  orderUuid: "",
                  conceptUuid: z.uuid,
                  display: z.display,
                  isNumeric: false,
                  minValue: null,
                  maxValue: null,
                  allowDecimals: false,
                };
                let answerfieldMapping = fieldMapping?.answers?.find(
                  (y) => y.concept == z.uuid
                );
                answerFieldMember.value = answerfieldMapping?.value ?? "";
                return answerFieldMember;
              });
            }

            return resultFieldMember;
          });
        }

        return resultField;
      }),
    },

    mode: "all",
    resolver: zodResolver(TestResultImportConfigFieldsSchema),
  });

  const { fields } = useFieldArray({
    control,
    name: "fields",
  });

  const handleInvalid = async (errors2) => {
    showSnackbar({
      isLowContrast: true,
      title: t("laboratoryTestResultImportError", "Error Loading Test Results"),
      kind: "error",
      subtitle: "Check and complete the required fields",
      autoClose: true,
    });
  };

  const loadResults = async (data: TestResultImportConfigFormData) => {
    try {
      let mappingsToSave = data.fields?.map((p) => {
        let result: TestResultImportConceptMapping = {
          concept: p.conceptUuid,
          scale: p.scale ? Number(p.scale) : null,
          value: p.value,
          display: p.display,
        };
        if (p.isCoded) {
          result.answers = p.answers
            ?.map((x) => {
              let answer: TestResultImportConceptMapping = {
                concept: x.conceptUuid,
                value: x.value,
                display: x.display,
              };
              return answer;
            })
            .sort((x, y) =>
              x.concept?.localeCompare(y.concept, undefined, {
                ignorePunctuation: true,
              })
            );
        }

        if (p.isPanel && p.setMembers) {
          let setMembers = p.setMembers.map((x) => {
            let groupMemberResult: TestResultImportConceptMapping = {
              concept: x.conceptUuid,
              display: x.display,
              scale: x.scale ? Number(x.scale) : null,
              value: x.value,
            };
            if (x.isCoded) {
              groupMemberResult.answers = x.answers
                ?.map((y) => {
                  let answer: TestResultImportConceptMapping = {
                    concept: y.conceptUuid,
                    value: y.value,
                    display: y.display,
                  };
                  return answer;
                })
                .sort((a, b) =>
                  a.concept?.localeCompare(b.concept, undefined, {
                    ignorePunctuation: true,
                  })
                );
            }
            return groupMemberResult;
          });
          if (setMembers.length > 0) {
            result.setMembers = setMembers.sort((a, b) =>
              a.concept?.localeCompare(b.concept, undefined, {
                ignorePunctuation: true,
              })
            );
          }
        }
        return result;
      });

      let testImportConfig = {
        test: { uuid: testResultImportConfig.test.uuid },
        fieldMapping: {
          mapping: mappingsToSave[0],
          headers: csvFields.headers,
          separatory: csvFields.separator,
          quote: csvFields.quote,
          sampleId: data.sampleId,
          session: testResultImportConfig.uuid,
          concept: testResultImportConfig.test.uuid,
        },
      };

      setIsBusy(true);
      let result = await createTestImportConfig(testImportConfig);
      let fillResult = loadWorkSheetTestResults(
        testImportConfig.fieldMapping.mapping,
        testImportConfig.fieldMapping.headers,
        testImportConfig.fieldMapping.sampleId,
        csvFields["rows"]
      );
      if (fillResult && fillResult.length > 0) {
        showNotification({
          title: t(
            "laboratoryUploadTestResultConfigMappingError",
            "Error filling test results"
          ),
          kind: "error",
          critical: true,
          description: fillResult,
        });
      } else {
        closeModal();
      }
    } catch (error) {
      showNotification({
        title: t(
          "laboratoryUploadTestResultConfigMappingError",
          "Error filling test results"
        ),
        kind: "error",
        critical: true,
        description: error?.message,
      });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className={`fullScreenModalTestImportConfig ${styles.modalWrapper}`}>
      <section>
        <ModalHeader
          closeModal={closeModal}
          title={`${t(
            "laboratoryTestResultsImportMapping",
            "Map Test Results Fields"
          )}: ${testResultImportConfig?.test?.display ?? ""}`}
        ></ModalHeader>
        <ModalBody className={`${styles.modalBody} ${styles.importConfigForm}`}>
          <section className={styles.section}>
            {/*  {Object.keys(errors).length > 0 && (
              <div className={styles.errorDiv}>{JSON.stringify(errors)}</div>
            )} */}
            <div style={{ paddingBottom: "1rem", width: "20rem" }}>
              <Controller
                name={"sampleId"}
                control={control}
                render={({ field: { value: selectedValue, onChange } }) => {
                  const selectedHeaderValue = csvFields?.headers?.find(
                    (x) => x.name == selectedValue
                  )?.value;
                  return (
                    <Select
                      value={selectedValue}
                      className={styles.textInput}
                      type="text"
                      hideLabel={false}
                      labelText={t(
                        "laboratoryTestResultsImportSampleId",
                        "Sample ID"
                      )}
                      helperText={
                        selectedHeaderValue ? `e.g. ${selectedHeaderValue}` : ""
                      }
                      onChange={(evt: ChangeEvent<HTMLSelectElement>) => {
                        onChange(evt.target.value);
                      }}
                      invalid={errors?.sampleId}
                      invalidText={errors?.sampleId?.message}
                    >
                      <SelectItem
                        text={t(
                          "laboratoryTestResultsImportOption",
                          "Choose field"
                        )}
                        value=""
                      />
                      {csvFields?.headers?.map((answer) => (
                        <SelectItem
                          key={answer.name}
                          text={answer.name}
                          value={answer.name}
                        >
                          {answer.name}
                        </SelectItem>
                      ))}
                    </Select>
                  );
                }}
              />
            </div>
            {fields.map((row, index) => {
              let entry = row as any as ResultField;
              return (
                <TestResultImportConfigFormField
                  rowIndex={index}
                  concept={entry.concept}
                  control={control}
                  errors={errors}
                  isCoded={entry.isCoded}
                  isPanel={entry.isPanel}
                  isTextOrNumeric={entry.isTextOrNumeric}
                  register={register}
                  controllerName={`fields.${index}`}
                  key={entry.id}
                  hideLabel={false}
                  testResultImportConfigMapping={csvFields}
                  setValue={setValue}
                />
              );
            })}
          </section>
        </ModalBody>
        <ModalFooter>
          <Button disabled={isBusy} kind="secondary" onClick={closeModal}>
            {t("cancel", "Cancel")}
          </Button>
          <Button
            disabled={isBusy}
            type="submit"
            onClick={handleSubmit(loadResults, handleInvalid)}
          >
            {isBusy ? (
              <InlineLoading />
            ) : (
              t("continueToFillResults", "Fill Results In Fields")
            )}
          </Button>
        </ModalFooter>
      </section>
    </div>
  );
};

export default ImportTestResultsConfig;
