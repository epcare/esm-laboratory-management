import React, { useState } from "react";
import styles from "./result-form.scss";
import {
  Button,
  InlineLoading,
  ModalBody,
  ModalFooter,
  Tag,
} from "@carbon/react";
import { useTranslation } from "react-i18next";
import { closeOverlay } from "../components/overlay/hook";
import isEqual from "lodash-es/isEqual";
import {
  FetchResponse,
  showNotification,
  showSnackbar,
  useSession,
} from "@openmrs/esm-framework";
import { useFieldArray, useForm } from "react-hook-form";
import { TestRequest } from "../api/types/test-request";
import { TestRequestItem } from "../api/types/test-request-item";
import PatientHeaderInfo from "../components/patient-header-info/patient-header-info.component";
import { Concept } from "../api/types/concept/concept";
import { formatTestName } from "../components/test-name";
import { WorksheetItemTestResultsFormData } from "../work-list/worksheet-item-test-result.validation-schema";
import {
  isCoded,
  isNumericConcept,
  isPanel,
  isTextOrNumeric,
  ResultField,
} from "./result-field";
import InlineResultFormField from "./inline-result-form-field.component";
import ControlledTextArea from "../components/controlled-text-area/controlled-text-area.component";
import { createTestResult } from "../api/test-result.resource";
import { handleMutate } from "../api/swr-revalidation";
import {
  URL_API_ENCOUNTER,
  URL_API_ORDER,
  URL_API_TEST_REQUEST,
  URL_API_WORKSHEET,
} from "../config/urls";
import { extractErrorMessagesFromResponse } from "../utils/functions";
import { SampleReferenceDisplay } from "../components/sample-reference-display";
import { formatDateTimeForDisplay } from "../utils/date-utils";
import { getEntityName } from "../components/test-request/entity-name";
import AttachResults from "./attach-results.component";

interface ResultFormProps {
  testRequest: TestRequest;
  testRequestItem: TestRequestItem;
  testConcept: Concept;
}

const ResultForm: React.FC<ResultFormProps> = ({
  testRequest,
  testRequestItem,
  testConcept,
}) => {
  const { t } = useTranslation();
  const userSession = useSession();
  const [isSaving, setIsSaving] = useState(false);
  const {
    control,
    register,
    formState: { isSubmitting, errors },
    getValues,
    handleSubmit,
  } = useForm<WorksheetItemTestResultsFormData>({
    defaultValues: {
      worksheetItems: [testRequestItem].map((p) => {
        let resultField: ResultField = {
          id: p.uuid,
          worksheetItem: null,
          worksheetItemUuid: p.uuid,
          concept: testConcept,
          isCoded: isCoded(testConcept),
          isPanel: isPanel(testConcept),
          isTextOrNumeric: isTextOrNumeric(testConcept),
          orderUuid: p.orderUuid,
          testResultUuid: p.testResult?.uuid,
          conceptUuid: testConcept.uuid,
          remarks: p.testResult?.remarks ?? "",
          isNumeric: isNumericConcept(testConcept),
          minValue: null,
          maxValue: null,
          allowDecimals: true,
        };

        if (resultField.isNumeric) {
          resultField.minValue = testConcept?.lowAbsolute;
          resultField.maxValue = testConcept?.hiAbsolute;
          resultField.allowDecimals = testConcept?.allowDecimal ?? true;
        }
        if (resultField.isPanel) {
          resultField.setMembers = testConcept.setMembers.map(
            (x, memberIndex) => {
              let memberValue = p.testResult?.obs?.groupMembers?.find(
                (y) => y.concept?.uuid == x.uuid
              );
              let resultFieldMember: ResultField = {
                id: `${p.uuid}-${memberIndex}`,
                concept: x,
                isCoded: isCoded(x),
                isPanel: isPanel(x),
                isTextOrNumeric: isTextOrNumeric(x),
                orderUuid: p.orderUuid,
                conceptUuid: x.uuid,
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
              if (resultFieldMember.isCoded) {
                resultFieldMember.value =
                  (memberValue?.value as any)?.uuid ?? "";
              } else if (resultFieldMember.isTextOrNumeric) {
                resultFieldMember.value = (memberValue?.value as string) ?? "";
              }
              return resultFieldMember;
            }
          );
        }
        if (resultField.isCoded) {
          resultField.value = p.testResult?.obs?.value?.uuid ?? "";
        } else if (resultField.isTextOrNumeric) {
          resultField.value = p.testResult?.obs?.value ?? "";
        }
        return resultField;
      }),
    },
  });

  const { fields } = useFieldArray({
    control,
    name: "worksheetItems",
  });

  const handleSaveTestResultClick = async (
    testResults: WorksheetItemTestResultsFormData
  ) => {
    let testResultsToSave = testResults.worksheetItems
      ?.map((p) => {
        let testResult = testRequestItem;
        let oldResult = {
          concept: { uuid: testConcept.uuid },
          status: "FINAL",
          order: { uuid: testResult.orderUuid },
        };
        if (p.isCoded) {
          oldResult["value"] = {
            uuid: testResult.testResult?.obs?.value?.uuid,
          };
        }

        if (p.isTextOrNumeric) {
          oldResult["value"] = testResult.testResult?.obs?.value + "";
        }

        if (p.isPanel && p.setMembers) {
          let setMembers = p.setMembers
            .map((x) => {
              let currentGroupValue =
                testResult?.testResult?.obs?.groupMembers?.find(
                  (j) => j.concept?.uuid == x.conceptUuid
                );
              let groupMemberResult = {
                concept: { uuid: x.conceptUuid },
                status: "FINAL",
                order: { uuid: x.orderUuid },
                value: undefined,
              };
              if (x.isCoded) {
                groupMemberResult["value"] = {
                  uuid: currentGroupValue?.value?.uuid,
                };
              }

              if (x.isTextOrNumeric) {
                groupMemberResult["value"] = currentGroupValue?.value + "";
              }
              return groupMemberResult;
            })
            .filter((y) => y.value)
            .sort((x, y) =>
              x.concept?.uuid?.localeCompare(y.concept?.uuid, undefined, {
                ignorePunctuation: true,
              })
            );
          if (setMembers.length > 0) {
            oldResult["groupMembers"] = setMembers;
          }
        }

        let result = {
          concept: { uuid: testConcept.uuid },
          status: "FINAL",
          order: { uuid: testResult.orderUuid },
        };
        if (p.isCoded && p.value) {
          result["value"] = { uuid: p.value };
        }

        if (p.isTextOrNumeric && p.value) {
          result["value"] = p.value;
        }

        if (p.isPanel && p.setMembers) {
          let setMembers = p.setMembers
            .map((x) => {
              let groupMemberResult = {
                concept: { uuid: x.conceptUuid },
                status: "FINAL",
                order: { uuid: x.orderUuid },
                value: undefined,
              };
              if (x.isCoded && x.value) {
                groupMemberResult["value"] = { uuid: x.value };
              }

              if (x.isTextOrNumeric && x.value) {
                groupMemberResult["value"] = x.value;
              }
              return groupMemberResult;
            })
            .filter((y) => y.value)
            .sort((x, y) =>
              x.concept?.uuid?.localeCompare(y.concept?.uuid, undefined, {
                ignorePunctuation: true,
              })
            );
          if (setMembers.length > 0) {
            result["groupMembers"] = setMembers;
          }
        }
        if (
          isEqual(oldResult, result) &&
          (p.remarks ?? "") === (testResult?.testResult?.remarks ?? "")
        ) {
          return null;
        }

        return {
          testRequestItemSampleUuid: testResult?.samples?.find((p) => true)
            ?.testRequestItemSampleUuid,
          obs: result,
          remarks: p.remarks,
        };
      })
      .filter((p) => p && (p.obs?.["value"] || p.obs?.["groupMembers"]));
    if (testResultsToSave.length == 0) {
      showSnackbar({
        isLowContrast: true,
        title: t(
          "laboratoryTestResultSubmitNoChanges",
          "No test result changes detected"
        ),
        kind: "error",
        subtitle: "Check and verify you have made changes you want to save",
        autoClose: true,
      });
      return;
    }

    try {
      let itemToSave = testResultsToSave[0];
      itemToSave["atLocationUuid"] = userSession?.sessionLocation?.uuid;
      setIsSaving(true);
      const response: FetchResponse<any> = await createTestResult(itemToSave);
      setIsSaving(false);

      handleMutate(URL_API_ORDER);
      handleMutate(URL_API_ENCOUNTER);
      handleMutate(URL_API_TEST_REQUEST);
      handleMutate(URL_API_WORKSHEET);

      if (response?.data) {
        showSnackbar({
          isLowContrast: true,
          title: t("laboratoryUpdateTestResult", "Update Test Results"),
          kind: "success",
          subtitle: t(
            "laboratorySavedTestResultSuccess",
            "Test Result saved Successfully"
          ),
        });
      }
      closeOverlay();
    } catch (error) {
      setIsSaving(false);
      showNotification({
        title: t(
          "laboratoryUpdateTestResultError",
          "Error updating test result(s)"
        ),
        kind: "error",
        critical: true,
        description: error?.message,
      });
    }
  };

  const handleInvalid = async (errors2) => {
    showSnackbar({
      isLowContrast: true,
      title: t("laboratoryTestResultSubmitError", "Error saving test result"),
      kind: "error",
      subtitle: "Check and complete the required fields",
      autoClose: true,
    });
  };

  return (
    <>
      <div>
        <ModalBody className={styles.modalBody}>
          {testRequest?.referredIn ? (
            <>
              <h6>{testRequest?.referralFromFacilityName}</h6>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  rowGap: "0.5rem",
                }}
              >
                <div>
                  {formatTestName(
                    testRequestItem?.testName,
                    testRequestItem?.testShortName
                  )}
                </div>
                <div>
                  {testRequestItem.samples?.map((sample) => (
                    <Tag type="green">
                      <SampleReferenceDisplay
                        showPrint={true}
                        reference={sample.accessionNumber}
                        className={styles.testSampleReference}
                        sampleUuid={sample.uuid}
                        sampleType={sample.sampleTypeName}
                        entityName={getEntityName(testRequest)}
                      />
                    </Tag>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <PatientHeaderInfo patientUuid={testRequest?.patientUuid} />
          )}

          {/* // we need to display test name for test panels */}
          {testConcept.setMembers.length > 0 && (
            <div>{testConcept.display}</div>
          )}
          {testConcept && (
            <section className={styles.section}>
              <form>
                {fields.map((row, index) => {
                  let entry = row as any as ResultField;
                  return (
                    <>
                      {errors?.worksheetItems?.[index]?.setMembers?.root && (
                        <div
                          className={styles.errorDiv}
                          style={{
                            gridColumn: "1 / span 2",
                            paddingLeft: "0.5rem",
                            paddingTop: "0.5rem",
                          }}
                        >
                          {
                            errors?.worksheetItems?.[index]?.setMembers?.root
                              .message
                          }
                        </div>
                      )}
                      <InlineResultFormField
                        rowIndex={index}
                        concept={entry.concept}
                        control={control}
                        errors={errors}
                        isCoded={entry.isCoded}
                        isPanel={entry.isPanel}
                        isTextOrNumeric={entry.isTextOrNumeric}
                        register={register}
                        controllerName={`worksheetItems.${index}`}
                        key={entry.worksheetItemUuid}
                        hideLabel={false}
                      />
                      <section>
                        <ControlledTextArea
                          id={`worksheetItems.${index}.remarks`}
                          name={`worksheetItems.${index}.remarks`}
                          control={control}
                          controllerName={`worksheetItems.${index}.remarks`}
                          maxLength={500}
                          value={`${entry.remarks ?? ""}`}
                          labelText={t(
                            "laboratoryTestResultAdditionalRemarks",
                            "Additional Remarks"
                          )}
                          invalid={!!errors.worksheetItems?.[index]?.remarks}
                          invalidText={
                            errors.worksheetItems?.[index]?.remarks?.message
                          }
                        />
                      </section>
                      {testRequestItem?.testResult && (
                        <section>
                          {t("lastResultsBy", "Last result(s) by")}{" "}
                          <strong>
                            {testRequestItem?.testResult?.resultByFamilyName ??
                              ""}{" "}
                            {testRequestItem?.testResult?.resultByMiddleName ??
                              ""}{" "}
                            {testRequestItem?.testResult?.resultByGivenName ??
                              ""}{" "}
                          </strong>
                          {t("on", "On")}
                          <strong>
                            {" "}
                            {formatDateTimeForDisplay(
                              testRequestItem?.testResult?.resultDate
                            )}{" "}
                          </strong>
                          {testRequestItem?.testResult?.atLocationName && (
                            <>
                              {" "}
                              {t("at", "At")}
                              <strong>
                                {" "}
                                {testRequestItem?.testResult?.atLocationName}
                              </strong>
                            </>
                          )}
                        </section>
                      )}
                    </>
                  );
                })}
              </form>
              {testRequestItem?.testResult && (
                <AttachResults
                  testResult={testRequestItem?.testResult}
                  mode="TestResult"
                  readonly={false}
                />
              )}
            </section>
          )}
        </ModalBody>

        <ModalFooter>
          <Button
            disabled={isSaving}
            onClick={() => closeOverlay()}
            kind="secondary"
          >
            {t("cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleSubmit(handleSaveTestResultClick, handleInvalid)}
          >
            {isSaving ? (
              <InlineLoading />
            ) : (
              t("laboratoryWorksheetSaveTestResults", "Save Test Results")
            )}
          </Button>
        </ModalFooter>
      </div>
    </>
  );
};

export default ResultForm;
