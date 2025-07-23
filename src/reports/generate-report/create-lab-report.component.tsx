import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  InlineLoading,
  ComboBox,
  DatePickerInput,
  DatePicker,
  Select,
  SelectItem,
  Form,
  TextInputSkeleton,
  NumberInput,
} from "@carbon/react";
import styles from "./create-lab-report.scss";
import { useTranslation } from "react-i18next";
import {
  DATE_PICKER_CONTROL_FORMAT,
  DATE_PICKER_FORMAT,
  formatDisplayDate,
  formatForDatePicker,
  today,
} from "../../utils/date-utils";
import { Controller, useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LabReportSchema, reportSchema } from "../report-validation-schema";
import {
  showNotification,
  showSnackbar,
  useLocations,
} from "@openmrs/esm-framework";
import { Concept } from "../../api/types/concept/concept";
import { createBatchJob, useReportTypes } from "../../api/batch-job.resource";
import {
  ReportParameter,
  getParamDefaultLimit,
  getReportEndDateLabel,
  getReportLimitLabel,
  getReportStartDateLabel,
  getTesterLabel,
} from "../../api/types/report-type";
import { closeOverlay } from "../../components/overlay/hook";
import { getConcept } from "../../api/concept.resource";
import { useLaboratoryConfig } from "../../hooks/useLaboratoryConfig";
import TestsComboSelector from "../../components/tests-selector/controlled-tests-selector.component";
import { formatTestName } from "../../components/test-name";
import PatientsSelector from "../../components/patient-selector/patient-selector.component";
import LocationsSelector from "../../components/locations-selector/locations-selector.component";
import UsersSelector from "../../components/users-selector/users-selector.component";
import ReferrerLocationSelector from "../../components/referral-locations-selector/referral-locations-selector.component";
import { handleMutate } from "../../api/swr-revalidation";
import { URL_API_BATCH_JOB } from "../../config/urls";
import { extractErrorMessagesFromResponse } from "../../utils/functions";
import {
  isCoded,
  isNumericConcept,
  isPanel,
  isTextOrNumeric,
  ResultField,
} from "../../results/result-field";
import FilterInlineResultFormField from "../../results/filter-inline-result-form-field.component";
import ControlledTextInput from "../../components/controlled-text-input/controlled-text-input.component";

interface CreateReportProps {
  model?: ReportModel;
}

export interface ReportModel {
  reportSystemName?: string;
  reportName?: string;
  parameters?: string[];
  date?: Date;
  startDate?: Date;
  endDate?: Date;
  locationName?: string;
  locationUuid?: string;
  patientUuid?: string;
  patientName?: string;
  referralLocationUuid?: string;
  referralLocationName?: string;
  limit?: number | null;
  diagnosticLocationUuid?: string;
  diagnosticLocationName?: string;
  testTypeUuid?: string;
  testTypeName?: string;
  testOutcomeUuid?: string;
  testOutcomeName?: string;
  testerUuid?: string;
  testerName?: string;
  testApproverUuid?: string;
  testApproverName?: string;
  referenceNumber?: string;
}
const CreateReport: React.FC<CreateReportProps> = ({ model }) => {
  const { t } = useTranslation();
  const {
    laboratoryConfig: { laboratoryLocationTag },
  } = useLaboratoryConfig();
  const diagnosticCenters = useLocations(laboratoryLocationTag);
  const { items: reportTypes, isLoading } = useReportTypes();
  const [loadingTestOutcome, setLoadingTestOutcome] = useState(false);
  const [renderTestOutcomeCount, setRenderTestOutcomeCount] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [displayDate, setDisplayDate] = useState<boolean>(false);
  const [displayStartDate, setDisplayStartDate] = useState<boolean>(false);
  const [displayEndDate, setDisplayEndDate] = useState<boolean>(false);
  const [displayLocation, setDisplayLocation] = useState<boolean>(false);
  const [displayPatient, setDisplayPatient] = useState<boolean>(false);
  const [displayReferralLocation, setDisplayReferralLocation] =
    useState<boolean>(false);
  const [displayLimit, setDisplayLimit] = useState<boolean>(false);
  const [displayDiagnosticLocation, setDisplayDiagnosticLocation] =
    useState<boolean>(false);
  const [displayTestType, setDisplayTestType] = useState<boolean>(false);
  const [displayTestOutcome, setDisplayTestOutcome] = useState<boolean>(false);
  const [displayTester, setDisplayTester] = useState<boolean>(false);
  const [displayTestApprover, setDisplayTestApprover] =
    useState<boolean>(false);
  const [displayReferenceNumber, setDisplayReferenceNumber] =
    useState<boolean>(false);
  const [selectedReportName, setSelectedReportName] = useState<string>(
    () => model?.reportName ?? ""
  );
  const [testOutcomeConcept, setTestOutcomeConcept] = useState<Concept>(null);

  const handleReportNameChange = (name: string) => {
    setSelectedReportName(name);
  };

  const {
    handleSubmit,
    control,
    formState: { errors, defaultValues, isDirty },
    setValue,
    register,
    watch,
  } = useForm<LabReportSchema>({
    mode: "all",
    defaultValues: () => {
      if (model) {
        return Promise.resolve((model ?? {}) as any);
      }
      return Promise.resolve({});
    },
    resolver: zodResolver(reportSchema),
  });

  const { fields, replace } = useFieldArray({
    control,
    name: "testOutcomes",
  });

  const updateTestOutcome = async (testConceptUuid: string) => {
    if (!testConceptUuid) {
      setValue("testOutcomes", null);
      replace(null);
      setTestOutcomeConcept(null);
      return;
    }
    setLoadingTestOutcome(true);
    try {
      const testConcept = await getConcept(testConceptUuid, {
        v: "fullchildren",
      });

      const newValue = [testConcept.data as Concept].map((p) => {
        let resultField: ResultField = {
          id: p.uuid,
          worksheetItem: null,
          worksheetItemUuid: p.uuid,
          concept: p,
          isCoded: isCoded(p),
          isPanel: isPanel(p),
          isTextOrNumeric: isTextOrNumeric(p),
          orderUuid: p.uuid,
          testResultUuid: p.uuid,
          conceptUuid: p.uuid,
          remarks: "",
          isNumeric: isNumericConcept(p),
          minValue: null,
          maxValue: null,
          allowDecimals: true,
        };

        if (resultField.isNumeric) {
          resultField.allowDecimals = p?.allowDecimal ?? true;
        }
        if (resultField.isPanel) {
          resultField.setMembers = p.setMembers.map((x, memberIndex) => {
            let memberValue = null;
            let resultFieldMember: ResultField = {
              id: `${p.uuid}-${memberIndex}`,
              concept: x,
              isCoded: isCoded(x),
              isPanel: isPanel(x),
              isTextOrNumeric: isTextOrNumeric(x),
              orderUuid: p.uuid,
              conceptUuid: x.uuid,
              isNumeric: isNumericConcept(x),
              minValue: null,
              maxValue: null,
              allowDecimals: true,
            };

            if (resultFieldMember.isNumeric) {
              resultFieldMember.allowDecimals = x?.allowDecimal ?? true;
            }
            if (resultFieldMember.isCoded) {
              resultFieldMember.value = (memberValue?.value as any)?.uuid ?? "";
            } else if (resultFieldMember.isTextOrNumeric) {
              resultFieldMember.value = "";
            }
            return resultFieldMember;
          });
        }
        if (resultField.isCoded) {
          resultField.value = "";
        } else if (resultField.isTextOrNumeric) {
          resultField.value = "";
        }
        return resultField as any;
      });
      setValue("testOutcomes", newValue);
      replace(newValue);
      setTestOutcomeConcept(testConcept.data);
    } catch (error) {
      setLoadingTestOutcome(false);
      showNotification({
        title: t(
          "laboratoryReportTestOutcomeLoadError",
          "Error loading test concept"
        ),
        kind: "error",
        critical: true,
        description: error?.message,
      });
    } finally {
      setLoadingTestOutcome(false);
      setRenderTestOutcomeCount((e) => e + 1);
    }
  };

  const onReportChanged = useCallback(() => {
    let hasResetParameters = false;
    if (selectedReportName) {
      const reportType = (reportTypes as any)?.find(
        (p) => p.name === selectedReportName
      );
      if (reportType) {
        const setDisplayParam = (
          name: string,
          requiredField: string,
          setDisplay: (display: boolean) => void
        ) => {
          let parameter = reportType.parameters?.find((p) => p.name === name);
          setDisplay(Boolean(parameter));
          let setValueTemp: any = setValue;
          setValueTemp(requiredField, parameter?.isRequired ?? false);
        };
        setDisplayParam(ReportParameter.Date, "dateRequired", setDisplayDate);
        setDisplayParam(
          ReportParameter.StartDate,
          "startDateRequired",
          setDisplayStartDate
        );
        setDisplayParam(
          ReportParameter.EndDate,
          "endDateRequired",
          setDisplayEndDate
        );
        setDisplayParam(
          ReportParameter.Location,
          "locationRequired",
          setDisplayLocation
        );

        setDisplayParam(
          ReportParameter.Patient,
          "patientRequired",
          setDisplayPatient
        );

        setDisplayParam(
          ReportParameter.ReferralLocation,
          "referralLocationRequired",
          setDisplayReferralLocation
        );
        setDisplayParam(
          ReportParameter.Limit,
          "limitRequired",
          setDisplayLimit
        );

        setDisplayParam(
          ReportParameter.DiagnosticLocation,
          "diagnosticLocationRequired",
          setDisplayDiagnosticLocation
        );
        setDisplayParam(
          ReportParameter.TestType,
          "testTypeRequired",
          setDisplayTestType
        );
        setDisplayParam(
          ReportParameter.TestOutcome,
          "testOutcomeRequired",
          setDisplayTestOutcome
        );
        setDisplayParam(
          ReportParameter.TestApprover,
          "testApproverRequired",
          setDisplayTestApprover
        );
        setDisplayParam(
          ReportParameter.Tester,
          "testerRequired",
          setDisplayTester
        );
        setDisplayParam(
          ReportParameter.ReferenceNumber,
          "referenceNumberRequired",
          setDisplayReferenceNumber
        );
        hasResetParameters = true;
      }
    }
    if (!hasResetParameters) {
      setDisplayDate(false);
      setValue("dateRequired", false);
      setDisplayStartDate(false);
      setValue("startDateRequired", false);
      setDisplayEndDate(false);
      setValue("endDateRequired", false);
      setDisplayLocation(false);
      setValue("locationRequired", false);
      setDisplayPatient(false);
      setValue("patientRequired", false);
      setDisplayReferralLocation(false);
      setValue("referralLocationRequired", false);
      setDisplayLimit(false);
      setValue("limitRequired", false);
      setDisplayDiagnosticLocation(false);
      setValue("diagnosticLocationRequired", false);
      setDisplayTestType(false);
      setValue("testTypeRequired", false);
      setDisplayTestOutcome(false);
      setValue("testOutcomeRequired", false);
      setDisplayTester(false);
      setValue("testerRequired", false);
      setDisplayReferenceNumber(false);
      setValue("referenceNumberRequired", false);
      setDisplayTestApprover(false);
      setValue("testApproverRequired", false);
    }
  }, [reportTypes, selectedReportName, setValue]);

  useEffect(() => {
    onReportChanged();
  }, [selectedReportName, reportTypes, onReportChanged]);

  const getReportParameter = (
    name: string,
    value: any,
    valueDescription: string,
    description: string,
    newLine: string
  ): any => {
    return {
      value: value,
      valueDescription: valueDescription,
      description: description,
    };
  };

  const getTestOutcomeDate = (report: LabReportSchema) => {
    let valueDescription = "";
    let outcome = report?.testOutcomes?.map((p) => {
      let testConcept = testOutcomeConcept;
      let result = {
        conceptUuid: testConcept.uuid,
      };
      if (p.isCoded && p.value) {
        result["value"] = { uuid: p.value };
        valueDescription =
          testOutcomeConcept?.display +
          ": " +
          (testConcept?.answers?.find((y) => y.uuid == p.value)?.display ?? "");
      }

      if (p.isTextOrNumeric) {
        if (!p.isNumeric) {
          if (p.value) {
            result["value"] = p.value;
            valueDescription = testOutcomeConcept?.display + ": " + p.value;
          }
        } else {
          if (p.minValue || p.maxValue) {
            let range = `${p.minValue ?? "*"} - ${p.maxValue ?? "*"}`;
            valueDescription = testOutcomeConcept?.display + ": " + range;
            if (p.minValue) {
              result["minValue"] = p.minValue;
            }
            if (p.maxValue) {
              result["maxValue"] = p.maxValue;
            }
          }
        }
      }

      if (p.isPanel && p.setMembers) {
        let setMembers = p.setMembers
          .map((x) => {
            let subSetMember = testOutcomeConcept?.setMembers?.find(
              (y) => y.uuid == x.conceptUuid
            );
            let groupMemberResult = {
              conceptUuid: x.conceptUuid,
              value: undefined,
            };
            if (x.isCoded && x.value) {
              groupMemberResult["value"] = { uuid: x.value };
              valueDescription =
                (valueDescription ? valueDescription + ", " : "") +
                subSetMember?.display +
                ": " +
                (subSetMember?.answers?.find((y) => y.uuid == x.value)
                  ?.display ?? "");
            }

            if (x.isTextOrNumeric) {
              if (!x.isNumeric) {
                if (x.value) {
                  groupMemberResult["value"] = x.value;
                  valueDescription =
                    (valueDescription ? valueDescription + ", " : "") +
                    subSetMember?.display +
                    ": " +
                    x.value;
                }
              } else {
                if (x.minValue || x.maxValue) {
                  let range = `${x.minValue ?? "*"} - ${x.maxValue ?? "*"}`;
                  valueDescription =
                    (valueDescription ? valueDescription + ", " : "") +
                    subSetMember?.display +
                    ": " +
                    range;
                  if (x.minValue) {
                    groupMemberResult["minValue"] = x.minValue;
                  }
                  if (x.maxValue) {
                    groupMemberResult["maxValue"] = x.maxValue;
                  }
                }
              }
            }
            return groupMemberResult;
          })
          .filter((y) => y.value || y["minValue"] || y["maxValue"]);
        if (setMembers.length > 0) {
          result["groupMembers"] = setMembers;
        }
      }
      return result;
    });
    return {
      outcome: outcome?.length > 0 ? outcome[0] : null,
      descr: valueDescription ?? null,
    };
  };

  const handleSave = async (report: LabReportSchema) => {
    const reportType = (reportTypes as any).find(
      (reportType) => reportType.name === report.reportName
    );

    setIsSaving(true);
    try {
      const newLine = "\r\n";
      let parameters = { report: reportType?.systemName };
      if (displayDate) {
        parameters[ReportParameter.Date] = getReportParameter(
          ReportParameter.Date,
          report.date ? JSON.stringify(report.date).split('"').join("") : "",
          formatDisplayDate(report.date) ?? "",
          t("displayReportDate", "labmanagement.report.edit.date"),
          newLine
        );
      }
      if (displayStartDate) {
        parameters[ReportParameter.StartDate] = getReportParameter(
          ReportParameter.StartDate,
          report.startDate
            ? JSON.stringify(report.startDate).split('"').join("")
            : "",
          formatDisplayDate(report.startDate) ?? "",
          t(getReportStartDateLabel(report.reportSystemName)),
          newLine
        );
      }
      if (displayEndDate) {
        parameters[ReportParameter.EndDate] = getReportParameter(
          ReportParameter.EndDate,
          report.endDate
            ? JSON.stringify(report.endDate).split('"').join("")
            : "",
          formatDisplayDate(report.endDate) ?? "",
          t(getReportEndDateLabel(report.reportSystemName)),
          newLine
        );
      }

      if (displayLocation) {
        parameters[ReportParameter.Location] = getReportParameter(
          ReportParameter.Location,
          report.locationUuid,
          report.locationName?.trim() ? report.locationName?.trim() : "",
          t("location", "Location"),
          newLine
        );
      }

      if (displayPatient) {
        parameters[ReportParameter.Patient] = getReportParameter(
          ReportParameter.Patient,
          report.patientUuid ?? "",
          report.patientName?.trim()
            ? report.patientName?.trim()
            : "All Patients",
          t("patients", "Patients"),
          newLine
        );
      }

      if (displayReferralLocation) {
        parameters[ReportParameter.ReferralLocation] = getReportParameter(
          ReportParameter.ReferralLocation,
          report.referralLocationUuid ?? "",
          report.referralLocationName?.trim()
            ? report.referralLocationName?.trim()
            : "All Reference Locations",
          t("LaboratoryReportReferenceLocations", "Reference Locations"),
          newLine
        );
      }

      if (displayLimit) {
        parameters[ReportParameter.Limit] = getReportParameter(
          ReportParameter.Limit,
          (
            report.limit ??
            getParamDefaultLimit(report.reportSystemName) ??
            20
          ).toString(),
          (
            report.limit ??
            getParamDefaultLimit(report.reportSystemName) ??
            20
          ).toString(),
          t(getReportLimitLabel(report.reportSystemName)),
          newLine
        );
      }

      if (displayDiagnosticLocation) {
        parameters[ReportParameter.DiagnosticLocation] = getReportParameter(
          ReportParameter.DiagnosticLocation,
          report.diagnosticLocationUuid ?? "",
          report.diagnosticLocationName?.trim()
            ? report.diagnosticLocationName
            : "All Lab Sections",
          t("laboaratoryDiagnosticCenter", "Lab Section"),
          newLine
        );
      }

      if (displayTestType) {
        parameters[ReportParameter.TestType] = getReportParameter(
          ReportParameter.TestType,
          report.testTypeUuid ?? "",
          report.testTypeName ? report.testTypeName : "All Tests",
          t("laboaratoryReportTestTypes", "Tests"),
          newLine
        );
      }

      if (displayTestOutcome) {
        const outcomes = getTestOutcomeDate(report);
        parameters[ReportParameter.TestOutcome] = getReportParameter(
          ReportParameter.TestOutcome,
          outcomes?.outcome ?? null,
          outcomes?.descr ? outcomes?.descr : "All Test Outcomes",
          t("laboaratoryReportTestOutcome", "Test Outcome"),
          newLine
        );
      }

      if (displayTester) {
        parameters[ReportParameter.Tester] = getReportParameter(
          ReportParameter.Tester,
          report.testerUuid ?? "",
          report.testerName ? report.testerName : "All Testers",
          t("laboaratoryReportTesters", "Testers"),
          newLine
        );
      }

      if (displayReferenceNumber) {
        parameters[ReportParameter.ReferenceNumber] = getReportParameter(
          ReportParameter.ReferenceNumber,
          report.referenceNumber ?? "",
          report.referenceNumber ? report.referenceNumber : "Any Sample",
          t("laboaratoryReportSampleReference", "Sample Reference"),
          newLine
        );
      }

      if (displayTestApprover) {
        parameters[ReportParameter.TestApprover] = getReportParameter(
          ReportParameter.TestApprover,
          report.testApproverUuid ?? "",
          report.testApproverName
            ? report.testApproverName
            : "All Test Approvers",
          t("laboaratoryReportTestApprovers", "Test Approvers"),
          newLine
        );
      }

      const newItem = {
        batchJobType: reportType?.batchJobType,
        description: report.reportName,
        parameters: parameters,
      };
      await createBatchJob(newItem)
        .then((response) => {
          closeOverlay();
          if (response.status === 201) {
            showSnackbar({
              autoClose: true,
              isLowContrast: true,
              title: t("batchJob", "Batch Job"),
              subtitle: t("BatchJobSuccess", "Batch job created successfully"),
              kind: "success",
            });
          } else {
            showSnackbar({
              autoClose: true,
              isLowContrast: true,
              title: t("BatchJobErrorTitle", "Batch job"),
              subtitle: t("batchJobErrorMessage", "Error creating batch job"),
              kind: "error",
            });
          }
          handleMutate(URL_API_BATCH_JOB);
        })
        .catch(() => {
          showSnackbar({
            autoClose: true,
            isLowContrast: true,
            title: t("BatchJobErrorTitle", "Batch job"),
            subtitle: t("batchJobErrorMessage", "Error creating batch job"),
            kind: "error",
          });
        });
      setIsSaving(false);
    } finally {
      setIsSaving(false);
    }
  };
  const onError = (error: any) => {
    console.error(error);
  };

  const testType = watch("testTypeUuid");
  const reportSystemName = watch("reportSystemName");

  if (isLoading && reportTypes.length == 0) {
    return (
      <InlineLoading
        status="active"
        iconDescription="Loading"
        description="Loading data..."
      />
    );
  }

  return (
    <Form onSubmit={handleSubmit(handleSave, onError)}>
      {/* <div className={styles.errorText}>
        {Object.entries(errors).map(([key, error]) => (
          <div>
            {key}:{error.message}
          </div>
        ))}
      </div> */}
      <div className={styles.reportContainer}>
        <>
          {reportTypes?.length == 0 ? (
            <TextInputSkeleton />
          ) : (
            <Controller
              control={control}
              name="reportName"
              render={({ field: { onChange, ref } }) => (
                <ComboBox
                  ref={ref}
                  control={control}
                  controllerName={"reportName"}
                  size="md"
                  labelText={t("reportName", "Report")}
                  itemToString={(item) => item?.name ?? ""}
                  placeholder="Filter..."
                  onChange={({ selectedItem }) => {
                    onChange(selectedItem?.name);
                    setValue("reportSystemName", selectedItem?.systemName);
                    handleReportNameChange(selectedItem?.name);
                  }}
                  initialSelectedItem={
                    model?.reportSystemName
                      ? ({
                          systemName: model?.reportSystemName,
                          name: model?.reportName,
                        } as any)
                      : null
                  }
                  items={
                    model?.reportSystemName
                      ? [
                          ...(reportTypes.some(
                            (x) => x.systemName === model?.reportSystemName
                          )
                            ? []
                            : [
                                {
                                  systemName: model?.reportSystemName,
                                  name: model?.reportName,
                                },
                              ]),
                          ...(reportTypes ?? []),
                        ]
                      : reportTypes
                  }
                  shouldFilterItem={(data) => true}
                  invalid={errors.reportSystemName}
                  invalidText={t(errors.reportSystemName?.message)}
                />
              )}
            />
          )}
        </>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            columnGap: "0.5rem",
          }}
        >
          {displayPatient && (
            <PatientsSelector
              title="Patient"
              selectedId={model?.patientUuid}
              selectedText={model?.patientName}
              placeholder={t("laboratoryReportPatient", "Patient")}
              control={control}
              controllerName="patientUuid"
              name="patientUuid"
              patientUuid={model?.patientUuid ?? ""}
              onPatientUuidChange={(e) => setValue("patientName", e?.display)}
              invalid={!!errors.patientUuid}
              invalidText={t(errors.patientUuid?.message)}
            ></PatientsSelector>
          )}

          {displayReferralLocation && (
            <ReferrerLocationSelector
              selectedId={model?.referralLocationUuid}
              selectedText={model?.referralLocationName}
              controllerName={"referralLocationUuid"}
              name="referralLocationUuid"
              control={control}
              title={t("locationReferral", "Reference Location:")}
              placeholder={t("chooseAnItem", "Choose an item")}
              onChange={(e) => {
                setValue(
                  "referralLocationName",
                  e?.name ??
                    e?.conceptName ??
                    (e?.patientFamilyName || e?.patientGivenName
                      ? `${e?.patientFamilyName} ${e?.patientMiddleName} ${e?.patientGivenName}`
                      : "")
                );
              }}
              invalid={!!errors.referralLocationUuid}
              invalidText={
                errors.referralLocationUuid &&
                errors?.referralLocationUuid?.message
              }
              referrerIn={true}
            />
          )}
        </div>

        {displayTestType && (
          <>
            <TestsComboSelector
              title={t("laboratoryReportTestType", "Test Type")}
              popUpDirection="bottom"
              selectedId={model?.testTypeUuid}
              selectedText={model ? formatTestName(model?.testTypeName) : ""}
              controllerName={`testTypeUuid`}
              name={`testTypeUuid`}
              control={control}
              onChange={(e) => {
                setValue(
                  "testTypeName",
                  formatTestName(e?.testName, e?.testShortName)
                );
                updateTestOutcome(e?.testUuid);
              }}
              placeholder={t("laboratoryReportAllTests", "All Tests")}
              invalid={!!errors?.testTypeUuid}
              invalidText={errors?.testTypeUuid?.message}
            />
            {displayTestOutcome && testType && (
              <>
                {fields.map((row, index) => {
                  let entry = row as any as ResultField;
                  return loadingTestOutcome ? (
                    <TextInputSkeleton />
                  ) : (
                    <>
                      {errors?.testOutcomes?.[index]?.setMembers?.root && (
                        <div
                          className={styles.errorDiv}
                          style={{
                            gridColumn: "1 / span 2",
                            paddingLeft: "0.5rem",
                            paddingTop: "0.5rem",
                          }}
                        >
                          {
                            errors?.testOutcomes?.[index]?.setMembers?.root
                              .message
                          }
                        </div>
                      )}
                      <div className={styles.testOutComesField}>
                        <FilterInlineResultFormField
                          rowIndex={index}
                          concept={entry.concept}
                          control={control}
                          errors={errors}
                          isCoded={entry.isCoded}
                          isPanel={entry.isPanel}
                          isTextOrNumeric={entry.isTextOrNumeric}
                          register={register}
                          controllerName={`testOutcomes.${index}`}
                          key={renderTestOutcomeCount}
                          hideLabel={false}
                        />
                      </div>
                    </>
                  );
                })}
              </>
            )}
          </>
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            columnGap: "0.5rem",
          }}
        >
          {displayStartDate && (
            <Controller
              control={control}
              name="startDate"
              render={({ field: { onChange, value } }) => (
                <DatePicker
                  datePickerType="single"
                  maxDate={formatForDatePicker(today())}
                  locale="en"
                  dateFormat={DATE_PICKER_CONTROL_FORMAT}
                  onChange={(dates: Date[]): void => {
                    onChange(dates[0]);
                  }}
                  value={value}
                >
                  <DatePickerInput
                    name="startDate"
                    placeholder={DATE_PICKER_FORMAT}
                    labelText={t("startDate", "Start Date")}
                    defaultValue=""
                    invalid={errors?.startDate?.message}
                    invalidText={errors?.startDate?.message}
                  />
                </DatePicker>
              )}
            />
          )}
          {displayEndDate && (
            <Controller
              control={control}
              name="endDate"
              render={({ field: { onChange, value } }) => (
                <DatePicker
                  datePickerType="single"
                  maxDate={formatForDatePicker(today())}
                  locale="en"
                  dateFormat={DATE_PICKER_CONTROL_FORMAT}
                  onChange={(dates: Date[]): void => {
                    onChange(dates[0]);
                  }}
                  value={value}
                >
                  <DatePickerInput
                    name="endDate"
                    placeholder={DATE_PICKER_FORMAT}
                    labelText={t("endDate", "End Date")}
                    defaultValue=""
                    invalid={errors?.endDate?.message}
                    invalidText={errors?.endDate?.message}
                  />
                </DatePicker>
              )}
            />
          )}
        </div>
        {displayDiagnosticLocation && (
          <Controller
            control={control}
            name="diagnosticLocationUuid"
            render={({ field: { onChange, ref, value } }) => (
              <Select
                ref={ref}
                name="diagnosticLocationUuid"
                value={value}
                className="select-field"
                labelText={t("laboratoryDiagnosticCenter", "Lab Section")}
                onChange={(e) => {
                  onChange(e.target.value);
                  setValue(
                    "diagnosticLocationName",
                    diagnosticCenters?.find((p) => p.uuid == e.target.value)
                      ?.display
                  );
                }}
                defaultValue=""
                invalid={errors?.diagnosticLocationUuid?.message}
                invalidText={errors?.diagnosticLocationUuid?.message}
              >
                <SelectItem
                  value=""
                  text={t("AllDiagonisticCenters", "All Lab Sections")}
                />
                {(diagnosticCenters ?? [])?.map((loc) => {
                  return (
                    <SelectItem
                      key={loc.uuid}
                      value={loc.uuid}
                      text={loc.display}
                    />
                  );
                })}
              </Select>
            )}
          />
        )}

        {displayLocation && (
          <LocationsSelector
            title=""
            selectedId={model?.locationUuid}
            selectedText={model?.locationName}
            placeholder={t("laboratoryReportPatient", "Patient")}
            control={control}
            controllerName="locationUuid"
            name="locationUuid"
            locationUuid={model?.locationUuid ?? ""}
            onLocationUuidChange={(e) => setValue("locationName", e?.display)}
            invalid={!!errors.locationUuid}
            invalidText={t(errors.locationUuid?.message)}
          ></LocationsSelector>
        )}

        {displayLimit && (
          <Controller
            control={control}
            name="limit"
            render={({ field: { onChange, value } }) => (
              <NumberInput
                allowEmpty={true}
                hideSteppers={true}
                value={value}
                onchange={onChange}
                label={t("limit", "Limit")}
                defaultValue={20}
                invalid={errors?.limit?.message}
                invalidText={errors?.limit?.message}
              />
            )}
          />
        )}

        {displayTester && (
          <>
            <UsersSelector
              selectedId={model?.testerUuid}
              selectedText={model?.testerName}
              controllerName={`testerUuid`}
              name={`testerUuid`}
              control={control}
              title={getTesterLabel(reportSystemName, t)}
              placeholder={t("filter", "Filter ...")}
              onUserChanged={(e) =>
                setValue("testerName", e?.person?.display ?? e?.display)
              }
              invalid={!!errors?.testerUuid}
              invalidText={errors?.testerUuid?.message}
            />
          </>
        )}

        {displayTestApprover && (
          <>
            <UsersSelector
              selectedId={model?.testApproverUuid}
              selectedText={model?.testApproverName}
              controllerName={`testApproverUuid`}
              name={`testApproverUuid`}
              control={control}
              title={t("laboratoryReportTestApprover", "Results Approver")}
              placeholder={t("filter", "Filter ...")}
              onUserChanged={(e) =>
                setValue("testApproverName", e?.person?.display ?? e?.display)
              }
              invalid={!!errors?.testApproverUuid}
              invalidText={errors?.testApproverUuid?.message}
            />
          </>
        )}
        {displayReferenceNumber && (
          <ControlledTextInput
            id={`id-referenceNumber`}
            name="referenceNumber"
            control={control}
            controllerName="referenceNumber"
            maxLength={255}
            size={"md"}
            value={`${model?.referenceNumber ?? ""}`}
            labelText={t(
              "laboratoryReportSampleReferenceNumber",
              "Sample Reference"
            )}
            invalid={!!errors.referenceNumber}
            invalidText={errors?.referenceNumber?.message}
          />
        )}

        {displayDate && (
          <Controller
            control={control}
            name="date"
            render={({ field: { onChange, value } }) => (
              <DatePicker
                datePickerType="single"
                maxDate={formatForDatePicker(today())}
                locale="en"
                dateFormat={DATE_PICKER_CONTROL_FORMAT}
                onChange={(dates: Date[]): void => {
                  onChange(dates[0]);
                }}
                value={value}
              >
                <DatePickerInput
                  name="date"
                  placeholder={DATE_PICKER_FORMAT}
                  labelText={t("date", "Date")}
                  defaultValue=""
                  invalid={errors?.date?.message}
                  invalidText={errors?.date?.message}
                />
              </DatePicker>
            )}
          />
        )}
      </div>
      <div className={styles.reportButton}>
        <Button
          disabled={isSaving}
          onClick={() => closeOverlay()}
          kind="secondary"
        >
          {t("cancel", "Cancel")}
        </Button>
        <Button onClick={handleSubmit(handleSave)}>
          {isSaving ? <InlineLoading /> : t("continue", "Continue")}
        </Button>
      </div>
    </Form>
  );
};

export default CreateReport;
