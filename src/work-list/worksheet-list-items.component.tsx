import {
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
  TableToolbar,
  TableToolbarContent,
  TableExpandHeader,
  TableExpandRow,
  TableExpandedRow,
  Tag,
  Button,
  InlineLoading,
} from "@carbon/react";
import {
  FetchResponse,
  isDesktop,
  showNotification,
  showSnackbar,
} from "@openmrs/esm-framework";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "../tests-ordered/laboratory-queue.scss";

import { formatDateTimeForDisplay } from "../utils/date-utils";
import { SampleReferenceDisplay } from "../components/sample-reference-display";
import { formatTestName } from "../components/test-name";
import DeleteWorksheetItemActionButton from "./delete-worksheet-item-action-button.component";
import {
  WorksheetItem,
  WorksheetItemStatusResulted,
} from "../api/types/worksheet-item";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  WorksheetItemTestResultsFormData,
  WorksheetItemTestResultsSchema,
} from "./worksheet-item-test-result.validation-schema";
import {
  isCoded,
  isNumericConcept,
  isNumericValue,
  isPanel,
  isTextOrNumeric,
  ResultField,
} from "../results/result-field";

import InlineResultFormField from "../results/inline-result-form-field.component";
import dayjs from "dayjs";
import ControlledTextArea from "../components/controlled-text-area/controlled-text-area.component";
import { handleMutate } from "../api/swr-revalidation";
import {
  URL_API_ENCOUNTER,
  URL_API_ORDER,
  URL_API_TEST_REQUEST,
  URL_API_WORKSHEET,
  URL_LAB_REQUESTS_ALL_ABS_REQUEST_NO,
} from "../config/urls";
import { createWorksheetTestResult } from "../api/test-result.resource";
import { extractErrorMessagesFromResponse } from "../utils/functions";
import isEqual from "lodash-es/isEqual";
import TestResultInfo from "../components/test-request/test-result-info.component";
import TestResultApprovalList from "../review-list/test-result-approval-list.component";
import ImportResultsButton from "./import-results/import-results-action-button.component";
import {
  DO_NOT_FILL_VALUE,
  TestResultImportConceptMapping,
  TestResultImportConfigMappingHeaders,
} from "../api/types/test-result-import-config";
import Decimal from "decimal.js";
import { getWorksheetItemEntityName } from "../components/test-request/entity-name";
import AttachResults from "../results/attach-results.component";

interface WorksheetListItemsProps {
  worksheetItems: Array<WorksheetItem>;
  expandRow: (rowId: string) => void;
  worksheetUuid: string;
  atLocationUuid: string;
  requireSingleTestTypeForResultsImport: boolean;
}

const WorksheetListItems: React.FC<WorksheetListItemsProps> = ({
  worksheetItems: items,
  worksheetUuid,
  atLocationUuid,
  requireSingleTestTypeForResultsImport,
}) => {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [fillResultsCount, setFillResultsCount] = useState(0);

  const [expandedItems, setExpandedItems] = useState<{
    [key: string]: boolean;
  }>({});

  const tableHeaders = [
    {
      id: 0,
      header: t("sampleType", "Sample Type"),
      key: "sampleType",
    },
    {
      id: 1,
      header: t("laboratorySampleReference", "Sample ID"),
      key: "accessionNumber",
    },
    {
      id: 2,
      header: t("collectionDate", "Collection Date"),
      key: "collectionDate",
    },
    {
      id: 3,
      header: t("volume", "Volume"),
      key: "volume",
    },
    { id: 4, header: t("containerType", "Container"), key: "containerType" },
    { id: 5, header: t("laboratorySampleTest", "Test"), key: "test" },
    { id: 6, header: t("laboratorySampleTestResult", "Result"), key: "result" },
    { id: 7, header: "", key: "actions" },
  ];

  const worksheetItemsSummary = useMemo(() => {
    let editable =
      items?.filter((p) => p.permission?.canEditTestResults)?.length ?? 0;
    let summary = items?.reduce(
      (x, y) => {
        x[y.testUuid] = true;
        x["attachment"] =
          x["attachment"] || (y.testResult?.hasAttachment ?? false);
        return x;
      },
      { attachment: false }
    );
    let singleTestType = Object.keys(summary).length == 2;
    return {
      singleTestType: singleTestType,
      canEditSome: editable > 0,
      allEditable: editable == items?.length,
      canAttachResultFile:
        singleTestType &&
        (!summary["attachment"] || editable == items?.length) &&
        !items.some((p) => !p.testResult),
    };
  }, [items]);

  const disableImport = !(
    !requireSingleTestTypeForResultsImport ||
    worksheetItemsSummary?.singleTestType
  );

  const {
    control,
    register,
    formState: { isSubmitting, errors },
    getValues,
    handleSubmit,
    setFocus,
    setValue,
  } = useForm<WorksheetItemTestResultsFormData>({
    defaultValues: {
      worksheetItems: items
        .sort(
          (x, y) =>
            (dayjs(x.dateCreated)?.toDate()?.getTime() ?? 0) -
            (dayjs(y.dateCreated)?.toDate()?.getTime() ?? 0)
        )
        .map((p) => {
          let resultField: ResultField = {
            id: p.uuid,
            worksheetItem: p,
            worksheetItemUuid: p.uuid,
            concept: p.testConcept,
            isCoded: isCoded(p.testConcept),
            isPanel: isPanel(p.testConcept),
            isTextOrNumeric: isTextOrNumeric(p.testConcept),
            orderUuid: p.orderUuid,
            testResultUuid: p.testResult?.uuid,
            conceptUuid: p.testConcept.uuid,
            remarks: p.testResult?.remarks ?? "",
            isNumeric: isNumericConcept(p.testConcept),
            minValue: null,
            maxValue: null,
            allowDecimals: true,
          };

          if (resultField.isNumeric) {
            resultField.minValue = p.testConcept?.lowAbsolute;
            resultField.maxValue = p.testConcept?.hiAbsolute;
            resultField.allowDecimals = p.testConcept?.allowDecimal ?? true;
          }

          if (resultField.isPanel) {
            resultField.setMembers = p.testConcept.setMembers.map(
              (x, memberIndex) => {
                let memberValue = p.testResult?.obs?.groupMembers?.find(
                  (y) => y.concept?.uuid == x.uuid
                );
                let resultFieldMember: ResultField = {
                  id: `${p.uuid}-${memberIndex}`,
                  worksheetItem: p,
                  worksheetItemUuid: p.uuid,
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
                  resultFieldMember.value =
                    (memberValue?.value as string) ?? "";
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
    } as WorksheetItemTestResultsFormData,
    mode: "all",
    resolver: zodResolver(WorksheetItemTestResultsSchema),
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
        let testResult = items.find((x) => x.uuid == p.worksheetItemUuid);
        if (!testResult.permission?.canEditTestResults) return null;
        let oldResult = {
          concept: { uuid: testResult.testConcept.uuid },
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
          concept: { uuid: testResult.testConcept.uuid },
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
        )
          return null;

        return {
          worksheetItemUuid: testResult.uuid,
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
        subtitle:
          "Check and verify you have input the test results for the worksheet item you want to save",
        autoClose: true,
      });
      return;
    }

    try {
      testResultsToSave.forEach((p) => {
        p["atLocationUuid"] = atLocationUuid;
      });
      let itemToSave = {
        testResults: testResultsToSave,
        worksheetUuid: worksheetUuid,
      };

      setIsSaving(true);
      const response: FetchResponse<any> = await createWorksheetTestResult(
        itemToSave
      );
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

  const loadTestResults = useCallback(
    (
      mapping: TestResultImportConceptMapping,
      headers: Array<TestResultImportConfigMappingHeaders>,
      sampleIdField: string,
      rows: Array<Array<string>>
    ) => {
      let testConceptUuid = mapping.concept;
      let testItems = items.filter(
        (p) =>
          p.permission?.canEditTestResults &&
          p.testConcept?.uuid == testConceptUuid
      );

      if (!rows || rows.length == 0) {
        return t(
          "laboratoryTestResultFillResultsNodata",
          "No data to fill the results"
        );
      }

      if (testItems.length == 0) {
        return t(
          "laboratoryTestResultFillResultsNoPendingTests",
          "No Pending tests to fill the results"
        );
      }

      let headersIndexes = headers.reduce((x, y) => {
        x[y.name] = y.index;
        return x;
      }, {} as { [key: string]: number });
      let sampleIdIndex = headersIndexes[sampleIdField];
      if (!sampleIdIndex) {
        return t(
          "laboratoryTestResultFillResultsSampleIdFieldNotFound",
          "Sample ID field not found"
        );
      }

      if (sampleIdIndex < 0 || sampleIdIndex >= rows[0].length) {
        return t(
          "laboratoryTestResultFillResultsSampleIdPosNotFound",
          "Sample ID not found in data to fill"
        );
      }

      let samplesToProcess = testItems.reduce((x, y) => {
        x[y.sampleAccessionNumber.toLowerCase().trim()] = true;
        return x;
      }, {});

      let dupSamples = Object.entries(
        rows.reduce((x, y) => {
          x[y[sampleIdIndex].toLowerCase().trim()] =
            (x[y[sampleIdIndex].toLowerCase().trim()] ?? 0) + 1;
          return x;
        }, {} as { [key: string]: number })
      ).filter(([x, y]) => y > 1);
      if (dupSamples.length > 0) {
        return t(
          "laboratoryTestResultFillResultsSampleIdDuplicate",
          `Sample ID ${dupSamples[0][0]} has ${dupSamples[0][1]} duplicate entries in the file`
        );
      }

      rows = rows.filter(
        (p) => samplesToProcess[p[sampleIdIndex].toLowerCase().trim()]
      );

      if (rows.length == 0) {
        return t(
          "laboratoryTestResultFillResultsNoMatchingSamples",
          "No matching samples found to fill the results"
        );
      }

      let sampleStatus: Array<{
        sampleId: string;
        message: string;
        success: boolean;
      }> = [];
      const currentValues = getValues();
      let actionsToUpdate: Array<{ fieldPath: string; value: any }> = [];
      rows.forEach((row) => {
        let rowSampleId = row[sampleIdIndex]?.toLowerCase()?.trim();
        let rowWorksheetItemIdex = currentValues.worksheetItems?.findIndex(
          (p) => {
            let rowResultField = p as any as ResultField;
            return (
              rowSampleId &&
              rowResultField?.worksheetItem?.sampleAccessionNumber
                ?.trim()
                .toLowerCase() == rowSampleId &&
              rowResultField?.worksheetItem?.permission?.canEditTestResults &&
              rowResultField?.concept?.uuid == testConceptUuid
            );
          }
        );
        if (rowWorksheetItemIdex < 0) {
          sampleStatus.push({
            sampleId: row[sampleIdIndex],
            message: "Not found in pending results",
            success: false,
          });
          return;
        }
        let worksheetItem = currentValues.worksheetItems[
          rowWorksheetItemIdex
        ] as any as ResultField;
        if (mapping.concept != worksheetItem.conceptUuid) {
          sampleStatus.push({
            sampleId: row[sampleIdIndex],
            message: "Concept mismatch or duplicate Sample IDs in the file",
            success: false,
          });
          return;
        }

        let rowUpdated = false;
        if (mapping.value && mapping.value != DO_NOT_FILL_VALUE) {
          let mappingValueIndex = headersIndexes[mapping.value];
          if (mappingValueIndex && mappingValueIndex < row.length) {
            let fieldValue = row[mappingValueIndex];
            if (worksheetItem.isNumeric) {
              let scale = new Decimal(1);
              if (isNumericValue(mapping.scale)) {
                scale = new Decimal(mapping.scale);
              }
              if (fieldValue && isNumericValue(fieldValue)) {
                let valueToSet = new Decimal(fieldValue).mul(scale);
                actionsToUpdate.push({
                  fieldPath: `worksheetItems.${rowWorksheetItemIdex}.value`,
                  value: valueToSet.toString(),
                });
                rowUpdated = true;
              }
            } else if (worksheetItem.isTextOrNumeric) {
              actionsToUpdate.push({
                fieldPath: `worksheetItems.${rowWorksheetItemIdex}.value`,
                value: fieldValue,
              });
              rowUpdated = true;
            } else if (worksheetItem.isCoded) {
              let matchingAnswer = mapping.answers?.find(
                (p) => p.value == fieldValue
              );
              if (!matchingAnswer && isNumericValue(fieldValue)) {
                let fvDecimal = new Decimal(fieldValue);
                matchingAnswer = mapping.answers?.find((p) => {
                  if (p.value?.startsWith("<") || p.value.startsWith(">")) {
                    if (p.value.length < 2) return false;
                    let rDecimal = new Decimal(p.value?.substring(1).trim());
                    return p.value?.startsWith("<")
                      ? fvDecimal.comparedTo(rDecimal) < 0
                      : fvDecimal.comparedTo(rDecimal) > 0;
                  } else {
                    let betweenIndex = p.value.indexOf("><");
                    if (
                      betweenIndex < 0 ||
                      betweenIndex == 0 ||
                      betweenIndex == p.value.length - 1
                    ) {
                      return false;
                    }
                    let ranges = p.value.split("><", 2);
                    if (ranges.length != 2) return false;
                    let allNumeric =
                      isNumericValue(ranges[0]) && isNumericValue(ranges[1]);
                    if (!allNumeric) return false;
                    return (
                      fvDecimal.comparedTo(new Decimal(ranges[0])) > 0 &&
                      fvDecimal.comparedTo(new Decimal(ranges[1])) < 0
                    );
                  }
                });
              }
              if (matchingAnswer) {
                let answerInConcept = worksheetItem.concept?.answers?.find(
                  (x) => x.uuid == matchingAnswer.concept
                );
                if (answerInConcept) {
                  actionsToUpdate.push({
                    fieldPath: `worksheetItems.${rowWorksheetItemIdex}.value`,
                    value: matchingAnswer.concept,
                  });
                  rowUpdated = true;
                }
              }
            }
          }
        }

        if (
          mapping.setMembers?.length > 0 &&
          worksheetItem.isPanel &&
          worksheetItem.setMembers?.length > 0
        ) {
          mapping.setMembers.forEach((setMember) => {
            if (setMember.value && setMember.value != DO_NOT_FILL_VALUE) {
              let setMemberValueIndex = headersIndexes[setMember.value];
              if (setMemberValueIndex && setMemberValueIndex < row.length) {
                let fieldValue = row[setMemberValueIndex];
                let rowSetMemberIndex = worksheetItem?.setMembers?.findIndex(
                  (p) => {
                    let rowResultField = p as any as ResultField;
                    return rowResultField?.conceptUuid == setMember?.concept;
                  }
                );
                if (rowSetMemberIndex < 0) {
                  return;
                }
                let rowSetMember = worksheetItem.setMembers[rowSetMemberIndex];
                if (rowSetMember.isNumeric) {
                  let scale = new Decimal(1);
                  if (isNumericValue(setMember.scale)) {
                    scale = new Decimal(setMember.scale);
                  }
                  if (fieldValue && isNumericValue(fieldValue)) {
                    let valueToSet = new Decimal(fieldValue).mul(scale);
                    actionsToUpdate.push({
                      fieldPath: `worksheetItems.${rowWorksheetItemIdex}.setMembers.${rowSetMemberIndex}.value`,
                      value: valueToSet.toString(),
                    });
                    rowUpdated = true;
                  }
                } else if (rowSetMember.isTextOrNumeric) {
                  actionsToUpdate.push({
                    fieldPath: `worksheetItems.${rowWorksheetItemIdex}.setMembers.${rowSetMemberIndex}.value`,
                    value: fieldValue,
                  });
                  rowUpdated = true;
                } else if (rowSetMember.isCoded) {
                  let matchingAnswer = setMember.answers?.find(
                    (p) => p.value == fieldValue
                  );
                  if (!matchingAnswer && isNumericValue(fieldValue)) {
                    let fvDecimal = new Decimal(fieldValue);
                    matchingAnswer = setMember.answers?.find((p) => {
                      if (p.value?.startsWith("<") || p.value.startsWith(">")) {
                        if (p.value.length < 2) return false;
                        let rDecimal = new Decimal(
                          p.value?.substring(1).trim()
                        );
                        return p.value?.startsWith("<")
                          ? fvDecimal.comparedTo(rDecimal) < 0
                          : fvDecimal.comparedTo(rDecimal) > 0;
                      } else {
                        let betweenIndex = p.value.indexOf("><");
                        if (
                          betweenIndex < 0 ||
                          betweenIndex == 0 ||
                          betweenIndex == p.value.length - 1
                        ) {
                          return false;
                        }
                        let ranges = p.value.split("><", 2);
                        if (ranges.length != 2) return false;
                        let allNumeric =
                          isNumericValue(ranges[0]) &&
                          isNumericValue(ranges[1]);
                        if (!allNumeric) return false;
                        return (
                          fvDecimal.comparedTo(new Decimal(ranges[0])) > 0 &&
                          fvDecimal.comparedTo(new Decimal(ranges[1])) < 0
                        );
                      }
                    });
                  }
                  if (matchingAnswer) {
                    let answerInConcept = rowSetMember.concept?.answers?.find(
                      (x) => x.uuid == matchingAnswer.concept
                    );
                    if (answerInConcept) {
                      actionsToUpdate.push({
                        fieldPath: `worksheetItems.${rowWorksheetItemIdex}.setMembers.${rowSetMemberIndex}.value`,
                        value: matchingAnswer.concept,
                      });
                      rowUpdated = true;
                    }
                  }
                }
              }
            }
          });
        }

        if (rowUpdated) {
          actionsToUpdate.push({
            fieldPath: `worksheetItems.${rowWorksheetItemIdex}.resultFilled`,
            value: true,
          });
        }
      });
      if (actionsToUpdate.length > 0) {
        actionsToUpdate.forEach((p) => (setValue as any)(p.fieldPath, p.value));
        showSnackbar({
          isLowContrast: true,
          title: t(
            "laboratoryUpdateTestResultFillSuccess",
            "Fill Test Results"
          ),
          kind: "success",
          subtitle: t(
            "laboratoryUpdateTestResultImportHighlight",
            "Samples with filled results are highlighted"
          ),
        });
        setFillResultsCount((e) => e + 1);
      }

      sampleStatus = sampleStatus.filter((p) => !p.success);
      let errorMessage = sampleStatus.reduce((x, y) => {
        if (!x) {
          x += ", " + "\n" + `${y.sampleId}: ${y.message}`;
          return x;
        } else {
          x = `${y.sampleId}: ${y.message}`;
          return x;
        }
      }, "");
      if (actionsToUpdate.length == 0) {
        return errorMessage;
      }

      if (errorMessage) {
        showNotification({
          title: t(
            "laboratoryUpdateTestResultImportError",
            "Error filling test result(s)"
          ),
          kind: "error",
          critical: true,
          description: errorMessage,
        });
      }
      return null;
    },
    [getValues, items, setValue, t]
  );

  return (
    <div className={styles.worksheetItemWrapper}>
      <DataTable
        headers={tableHeaders}
        rows={fields as any}
        isSortable={false}
        useZebraStyles
        overflowMenuOnHover={true}
        render={({
          headers,
          getHeaderProps,
          getTableProps,
          getRowProps,
          expandRow,
          getToolbarProps,
        }) => {
          const onExpandRow = (e: MouseEvent, rowId: string) => {
            expandedItems[rowId] = Boolean(!expandedItems[rowId]);
            expandRow(rowId);
          };

          const onEditPanelResults = (rowId: string, index: number) => {
            if (!expandedItems[rowId]) {
              expandedItems[rowId] = true;
              expandRow(rowId);
            }
            setTimeout(() => {
              setFocus(`worksheetItems.${index}.setMembers.0.value`);
              setFocus(`worksheetItems.${index}.value`);
            }, 100);
          };
          return (
            <TableContainer className={`${styles.tableContainer}`}>
              <TableToolbar
                {...getToolbarProps()}
                style={{
                  position: "static",
                  margin: 0,
                }}
              >
                <TableToolbarContent
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      paddingLeft: "1rem",
                      display: "flex",
                      flexDirection: "row",
                      gap: "1rem",
                    }}
                  >
                    <span>
                      {items.length}-{t("items", "Item(s)")}
                    </span>
                    <span>
                      {
                        items.filter(
                          (p) =>
                            p.testResult ||
                            p.status == WorksheetItemStatusResulted
                        ).length
                      }
                      {"-"}
                      {t("laboratoryResulted", "Resulted")}
                    </span>
                  </div>
                  {items?.some((p) => p.permission?.canEditTestResults) && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                      }}
                    >
                      <ImportResultsButton
                        disableImport={disableImport}
                        loadTestResults={loadTestResults}
                        worksheetItems={items}
                      />
                      <Button
                        onClick={handleSubmit(
                          handleSaveTestResultClick,
                          handleInvalid
                        )}
                        size="md"
                        kind="secondary"
                      >
                        {isSaving ? (
                          <InlineLoading />
                        ) : (
                          t(
                            "laboratoryWorksheetSaveTestResults",
                            "Save Test Results"
                          )
                        )}
                      </Button>
                    </div>
                  )}
                </TableToolbarContent>
              </TableToolbar>
              <Table
                {...getTableProps()}
                className={styles.activePatientsTable}
              >
                <TableHead>
                  <TableRow>
                    <TableExpandHeader />
                    {headers.map(
                      (header) =>
                        header.key !== "details" && (
                          <TableHeader
                            {...getHeaderProps({
                              header,
                              isSortable: false,
                            })}
                            className={
                              isDesktop
                                ? styles.desktopHeader
                                : styles.tabletHeader
                            }
                            key={`${header.key}`}
                          >
                            {header.header?.content ?? header.header}
                          </TableHeader>
                        )
                    )}
                  </TableRow>
                </TableHead>
                <TableBody key={fillResultsCount}>
                  {fields.map((row, index) => {
                    let entry = row as any as ResultField;
                    return (
                      <React.Fragment key={row.id}>
                        <TableExpandRow
                          className={`${
                            isDesktop ? styles.desktopRow : styles.tabletRow
                          } ${
                            entry.worksheetItem.permission
                              ?.canEditTestResults ||
                            (entry?.worksheetItem.permission
                              ?.canViewTestResults &&
                              entry?.worksheetItem?.testResult)
                              ? ""
                              : styles.noTestResultsRow
                          } ${
                            getValues(`worksheetItems.${index}.resultFilled`)
                              ? styles.highlightTestResult ?? ""
                              : ""
                          }`}
                          {...getRowProps({ row })}
                          key={row.id}
                          isExpanded={Boolean(expandedItems[row.id])}
                          onExpand={(e) => onExpandRow(e, row.id)}
                        >
                          <TableCell>
                            {entry.worksheetItem.sampleTypeName}
                          </TableCell>
                          <TableCell>
                            <Tag type="green">
                              <SampleReferenceDisplay
                                showPrint={true}
                                reference={
                                  entry.worksheetItem.sampleAccessionNumber
                                }
                                className={styles.testSampleReference}
                                sampleType={entry.worksheetItem.sampleTypeName}
                                entityName={getWorksheetItemEntityName(
                                  entry.worksheetItem
                                )}
                              />
                            </Tag>
                          </TableCell>
                          <TableCell>
                            <div>
                              {entry.worksheetItem.sampleCollectionDate
                                ? formatDateTimeForDisplay(
                                    entry.worksheetItem.sampleCollectionDate
                                  )
                                : "Unknown"}
                              <div>
                                {
                                  entry.worksheetItem
                                    .sampleCollectedByFamilyName
                                }{" "}
                                {
                                  entry.worksheetItem
                                    .sampleCollectedByMiddleName
                                }{" "}
                                {entry.worksheetItem.sampleCollectedByGivenName}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {entry.worksheetItem.sampleVolume
                              ? `${
                                  entry.worksheetItem.sampleVolume?.toLocaleString() ??
                                  ""
                                }${entry.worksheetItem.sampleVolumeUnitName}`
                              : "N/A"}
                          </TableCell>
                          <TableCell>{`${
                            entry.worksheetItem.sampleContainerCount ?? ""
                          } ${
                            entry.worksheetItem.sampleContainerTypeName ?? "N/A"
                          }`}</TableCell>
                          <TableCell>
                            <div>
                              <Tag type="blue">
                                <span className={styles.testRequestSampleTest}>
                                  {formatTestName(
                                    entry.worksheetItem.testName,
                                    entry.worksheetItem.testShortName
                                  )}{" "}
                                </span>
                              </Tag>
                              <div className={styles.worksheetTestFooter}>
                                <a
                                  href={URL_LAB_REQUESTS_ALL_ABS_REQUEST_NO(
                                    entry.worksheetItem.testRequestNo,
                                    ""
                                  )}
                                  target="_blank"
                                >
                                  {entry.worksheetItem.testRequestNo}
                                </a>
                                {", "}
                                {entry.worksheetItem.orderNumber}
                                {", "}
                                {entry.worksheetItem.referralFromFacilityName
                                  ? `${
                                      entry.worksheetItem.referralInExternalRef
                                        ? entry.worksheetItem
                                            .referralInExternalRef + "-"
                                        : ""
                                    }${
                                      entry.worksheetItem
                                        .referralFromFacilityName
                                    }`
                                  : `${entry.worksheetItem.patientIdentifier}-${
                                      entry.worksheetItem.patientFamilyName ??
                                      ""
                                    }
                ${entry.worksheetItem.patientGivenName ?? ""}
                ${entry.worksheetItem.patientMiddleName ?? ""}`}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {entry.worksheetItem.permission
                              ?.canEditTestResults ? (
                              entry?.isPanel ? (
                                <Button
                                  size="sm"
                                  className={styles.headerButton}
                                  iconDescription="Edit Results"
                                  kind="ghost"
                                  onClick={(e) =>
                                    onEditPanelResults(row.id, index)
                                  }
                                >
                                  {entry?.worksheetItem?.testResult
                                    ? t("laboratoryEditResults", "Edit Results")
                                    : t("laboratoryAddResults", "Add Results")}
                                </Button>
                              ) : (
                                <div>
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
                                    hideLabel
                                  />
                                </div>
                              )
                            ) : entry?.worksheetItem.permission
                                ?.canViewTestResults ? (
                              <>
                                {entry?.worksheetItem?.testResult?.obs?.display?.indexOf(
                                  ":"
                                ) > 0
                                  ? entry?.worksheetItem?.testResult?.obs?.display?.substring(
                                      entry?.worksheetItem?.testResult?.obs?.display?.indexOf(
                                        ":"
                                      ) + 1
                                    )
                                  : entry?.worksheetItem?.testResult?.obs
                                      ?.display}
                              </>
                            ) : entry.worksheetItem.testResultUuid ? (
                              t("accessDenied", "Access Denied")
                            ) : (
                              t("No Test Results")
                            )}
                          </TableCell>
                          <TableCell>
                            {entry?.worksheetItem.permission?.canDelete ? (
                              <div
                                className={`${styles.clearGhostButtonPadding} ${styles.rowActions}`}
                              >
                                {entry?.worksheetItem.permission?.canDelete && (
                                  <DeleteWorksheetItemActionButton
                                    worksheet={entry}
                                  />
                                )}
                              </div>
                            ) : (
                              ""
                            )}
                          </TableCell>
                        </TableExpandRow>
                        {(entry.worksheetItem.permission?.canEditTestResults ||
                          (entry?.worksheetItem.permission
                            ?.canViewTestResults &&
                            entry?.worksheetItem?.testResult)) && (
                          <TableExpandedRow
                            className={`${styles.tableExpandedRow} ${styles.worksheetItemTableExpandedRow}`}
                            colSpan={headers.length + 1}
                          >
                            {expandedItems[row.id] && (
                              <div className={styles.worksheetItemRowDetails}>
                                {entry.worksheetItem.permission
                                  ?.canEditTestResults && (
                                  <div className={styles.worksheetItemInput}>
                                    {entry.isPanel && (
                                      <div
                                        className={
                                          styles.worksheetItemInlineExpField
                                        }
                                      >
                                        {errors?.worksheetItems?.[index]
                                          ?.setMembers?.root && (
                                          <div
                                            className={styles.errorDiv}
                                            style={{
                                              gridColumn: "1 / span 2",
                                              paddingLeft: "0.5rem",
                                              paddingTop: "0.5rem",
                                            }}
                                          >
                                            {
                                              errors?.worksheetItems?.[index]
                                                ?.setMembers?.root.message
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
                                          isTextOrNumeric={
                                            entry.isTextOrNumeric
                                          }
                                          register={register}
                                          controllerName={`worksheetItems.${index}`}
                                          key={entry.worksheetItemUuid}
                                          hideLabel={false}
                                        />
                                      </div>
                                    )}
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
                                      invalid={
                                        !!errors.worksheetItems?.[index]
                                          ?.remarks
                                      }
                                      invalidText={
                                        errors.worksheetItems?.[index]?.remarks
                                          ?.message
                                      }
                                    />
                                    {entry?.worksheetItem?.testResult && (
                                      <div style={{ padding: "1rem" }}>
                                        <div
                                          className={
                                            entry?.worksheetItem?.testResult
                                              ?.approvals?.length > 0
                                              ? styles.lastResultBy
                                              : ""
                                          }
                                          style={{
                                            paddingBottom: "0.5rem",
                                          }}
                                        >
                                          {t(
                                            "lastResultsBy",
                                            "Last results by"
                                          )}{" "}
                                          <strong>
                                            {entry?.worksheetItem?.testResult
                                              ?.resultByFamilyName ?? ""}{" "}
                                            {entry?.worksheetItem?.testResult
                                              ?.resultByMiddleName ?? ""}{" "}
                                            {entry?.worksheetItem?.testResult
                                              ?.resultByGivenName ?? ""}{" "}
                                          </strong>
                                          {t("on", "On")}
                                          <strong>
                                            {" "}
                                            {formatDateTimeForDisplay(
                                              entry?.worksheetItem?.testResult
                                                ?.resultDate
                                            )}{" "}
                                          </strong>
                                          {entry?.worksheetItem?.testResult
                                            ?.atLocationName && (
                                            <>
                                              {" "}
                                              {t("at", "At")}
                                              <strong>
                                                {" "}
                                                {
                                                  entry?.worksheetItem
                                                    ?.testResult?.atLocationName
                                                }
                                              </strong>
                                            </>
                                          )}
                                        </div>
                                        {entry?.worksheetItem?.testResult && (
                                          <AttachResults
                                            testResult={
                                              entry?.worksheetItem?.testResult
                                            }
                                            mode="TestResult"
                                            readonly={false}
                                          />
                                        )}
                                        {entry?.worksheetItem?.testResult
                                          ?.approvals?.length > 0 && (
                                          <TestResultApprovalList
                                            approvals={
                                              entry?.worksheetItem?.testResult
                                                ?.approvals
                                            }
                                          />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {!entry.worksheetItem.permission
                                  ?.canEditTestResults &&
                                  entry?.worksheetItem.permission
                                    ?.canViewTestResults &&
                                  entry?.worksheetItem.testResult && (
                                    <>
                                      <TestResultInfo
                                        testConcept={
                                          entry?.worksheetItem?.testConcept
                                        }
                                        testResult={
                                          entry?.worksheetItem?.testResult
                                        }
                                      />
                                      {entry?.worksheetItem?.testResult
                                        ?.approvals?.length > 0 && (
                                        <TestResultApprovalList
                                          approvals={
                                            entry?.worksheetItem?.testResult
                                              ?.approvals
                                          }
                                        />
                                      )}
                                    </>
                                  )}
                              </div>
                            )}
                          </TableExpandedRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
              {(items?.length ?? 0) === 0 ? (
                <div className={styles.tileContainer}>
                  <Tile className={styles.tile}>
                    <div className={styles.tileContent}>
                      <p className={styles.content}>
                        {t(
                          "noLaboratorySamplesToDisplay",
                          "No samples to display"
                        )}
                      </p>
                    </div>
                  </Tile>
                </div>
              ) : null}
            </TableContainer>
          );
        }}
      ></DataTable>
      {worksheetItemsSummary?.canAttachResultFile && (
        <AttachResults
          worksheetUuid={worksheetUuid}
          mode="Worksheet"
          readonly={false}
        />
      )}
    </div>
  );
};

export default WorksheetListItems;
