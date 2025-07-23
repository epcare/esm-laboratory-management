import React, {
  useState,
  ChangeEvent,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import {
  showNotification,
  showSnackbar,
  useSession,
  FetchResponse,
  navigate,
  useLocations,
} from "@openmrs/esm-framework";
import {
  InlineLoading,
  Button,
  DatePicker,
  DatePickerInput,
  Tab,
  Tabs,
  TextArea,
  TabList,
  TabPanel,
  TabPanels,
  Select,
  TextInputSkeleton,
  SelectItem,
  Tooltip,
  TextInput,
} from "@carbon/react";
import { useTranslation } from "react-i18next";
import {
  DATE_PICKER_CONTROL_FORMAT,
  DATE_PICKER_FORMAT,
  formatAsPlainDateForTransfer,
  formatDateForDisplay,
  formatForDatePicker,
  today,
} from "../utils/date-utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import ControlledTextArea from "../components/controlled-text-area/controlled-text-area.component";
import {
  URL_API_ENCOUNTER,
  URL_API_ORDER,
  URL_API_TEST_REQUEST,
  URL_API_WORKSHEET,
  URL_LAB_WORKSHEET_ABS,
  URL_LAB_WORKSHEET_VIEW_ABS,
} from "../config/urls";
import { handleMutate } from "../api/swr-revalidation";
import { extractErrorMessagesFromResponse } from "../utils/functions";
import ControlledTextInput from "../components/controlled-text-input/controlled-text-input.component";
import {
  Worksheet,
  WorksheetSelectedItemOptions,
} from "../api/types/worksheet";
import {
  WorksheetFormData,
  WorksheetSchema,
} from "./worksheet-validation-schema";
import { WorksheetItem } from "../api/types/worksheet-item";
import { createWorksheet, updateWorksheet } from "../api/worksheet.resource";
import { useSampleResource } from "../api/sample.resource";
import UsersSelector from "../components/users-selector/users-selector.component";
import { otherUser } from "../api/users.resource";
import styles from "./work-list.scss";
import TestsComboSelector from "../components/tests-selector/controlled-tests-selector.component";
import { formatTestName } from "../components/test-name";
import { ArrowShiftDown, CallsIncoming } from "@carbon/react/icons";
import WorksheetSampleOptionsList from "./edit-left-worksheet-sample-options.component";
import { SampleStatusTesting } from "../api/types/sample";
import {
  TestRequestItem,
  TestRequestItemStatusInProgress,
} from "../api/types/test-request-item";
import { ResourceRepresentation } from "../api/resource-filter-criteria";
import { useOrderDate } from "../hooks/useOrderDate";
import ConceptMembersSelector from "../components/concepts-selector/concept-members-selector.component";
import { UrgencyTypes } from "../api/types/urgency";
import debounce from "lodash-es/debounce";
import PatientsSelector from "../components/patient-selector/patient-selector.component";
import WorksheetItemsList from "./edit-right-worksheet-items.component";
import dayjs from "dayjs";
import { useLaboratoryConfig } from "../hooks/useLaboratoryConfig";

export interface EditWorksheetProps {
  model?: Worksheet | null;
}

const EditWorksheet: React.FC<EditWorksheetProps> = ({ model }) => {
  const { t } = useTranslation();

  const [canEdit] = useState(() => model == null || model.permission?.canEdit);
  const {
    laboratoryConfig: { laboratoryLocationTag, laboratorySpecimenTypeConcept },
  } = useLaboratoryConfig();

  const [selectedItemOptions, setSelectedItemOptions] =
    useState<WorksheetSelectedItemOptions>({});

  const [rightSelectedItemOptions, setRightSelectedItemOptions] =
    useState<WorksheetSelectedItemOptions>({});

  const locations = useLocations(laboratoryLocationTag);
  const { currentOrdersDate } = useOrderDate();

  const maxDate: Date = today();
  const [selectedTab, setSelectedTab] = useState(0);
  const session = useSession();
  const [sampleRefSearch, setSampleRefSearch] = useState<string>();
  const [dbWorksheetItems] = useState<WorksheetItem[]>(() => {
    return model?.worksheetItems ?? [];
  });

  const {
    items: dbItemOptions,
    minActivatedDate,
    setMinActivatedDate,
    setTestConcept,
    testItemLocation,
    setTestItemLocation,
    patientUuid,
    setPatientUuid,
    sampleType,
    setSampleType,
    urgency,
    setUrgency,
    setSampleRef,
  } = useSampleResource({
    v: ResourceRepresentation.Full,
    sampleStatus: SampleStatusTesting,
    testRequestItemStatuses: TestRequestItemStatusInProgress,
    minActivatedDate: currentOrdersDate,
    testConcept: model?.testUuid ? model.testUuid : null,
    includeTestResultId: true,
    tests: true,
    allTests: false,
    limit: 100,
    forWorksheet: true,
  });

  useEffect(() => {
    if (minActivatedDate !== currentOrdersDate) {
      setMinActivatedDate(currentOrdersDate);
    }
  }, [currentOrdersDate, minActivatedDate, setMinActivatedDate]);

  const debouncedSampleNumber = useMemo(
    () =>
      debounce((searchTerm) => {
        setSampleRef(searchTerm);
        setSampleType(null);
        setUrgency(null);
        setTestConcept(null);
      }, 1000),
    [setSampleRef, setSampleType, setTestConcept, setUrgency]
  );

  const { handleSubmit, control, formState, watch, setValue } =
    useForm<WorksheetFormData>({
      defaultValues: {
        ...(model ?? {}),
        ...(model?.worksheetDate
          ? { worksheetDate: dayjs(model.worksheetDate).toDate() }
          : { worksheetDate: today() }),
        ...{
          worksheetItems: model?.worksheetItems ?? new Array<WorksheetItem>(),
          atLocationUuid: model?.atLocationUuid,
          responsiblePersonUuid: model?.uuid
            ? model?.responsiblePersonUuid
              ? model?.responsiblePersonUuid
              : otherUser.uuid
            : model?.responsiblePersonUuid ?? session?.user?.uuid,
        },
      },
      resolver: zodResolver(WorksheetSchema),
    });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (record: any) => {
    return handleSaveInternal(record, false);
  };

  const handleSaveInternal = async (record: any, goToWorksheets: boolean) => {
    let item = record as Worksheet;
    try {
      let worksheetItems = item.worksheetItems
        .map((p) => {
          return {
            testRequestItemSampleUuid: p.testRequestItemSampleUuid,
          };
        })
        .filter((p) => p != null);

      let requestItem = {
        atLocationUuid: record.atLocationUuid,
        worksheetDate: formatAsPlainDateForTransfer(item.worksheetDate),
        remarks: item.remarks,
        testUuid: item.testUuid ?? null,
        diagnosisTypeUuid: item.diagnosisTypeUuid ?? null,
        responsiblePersonUuid:
          item.responsiblePersonUuid == otherUser.uuid
            ? null
            : item.responsiblePersonUuid,
        responsiblePersonOther: item.responsiblePersonOther,
        worksheetItems: worksheetItems,
      };
      setIsSaving(true);
      const response: FetchResponse<Worksheet> = await (model?.uuid
        ? updateWorksheet(model?.uuid, requestItem)
        : createWorksheet(requestItem));
      setIsSaving(false);

      handleMutate(URL_API_ORDER);
      handleMutate(URL_API_ENCOUNTER);
      handleMutate(URL_API_TEST_REQUEST);
      handleMutate(URL_API_WORKSHEET);

      if (response?.data) {
        showSnackbar({
          isLowContrast: true,
          title: model?.uuid
            ? t("laboratoryUpdateWorksheet", "Update Worksheet")
            : t("laboratoryAddWorksheet", "Add Worksheet"),
          kind: "success",
          subtitle: t(
            "laboratorySavedWorksheetSuccess",
            "Worksheet saved Successfully"
          ),
        });
        if (goToWorksheets) {
          navigate({ to: URL_LAB_WORKSHEET_ABS });
        } else {
          if (!model?.uuid) {
            navigate({ to: URL_LAB_WORKSHEET_VIEW_ABS(response.data?.uuid) });
          }
        }
      }
    } catch (error) {
      setIsSaving(false);
      showNotification({
        title: model?.uuid
          ? t("laboratoryUpdateWorksheetError", "Error updating worksheet")
          : t("laboratoryAddWorksheetError", "Error adding worksheet"),
        kind: "error",
        critical: true,
        description: error?.message,
      });
    }
  };

  const { errors } = formState;

  const handleInvalid = async () => {
    showSnackbar({
      isLowContrast: true,
      title: t("laboratoryWorksheetSubmitError", "Error saving worksheet"),
      kind: "error",
      subtitle: "Check and complete the required fields",
      autoClose: true,
    });
  };

  const responsibilityPersonUuid = watch(
    "responsiblePersonUuid",
    model?.responsiblePersonUuid
  );

  const worksheetItems = watch("worksheetItems", [
    ...((model?.worksheetItems as any) ?? []),
  ] as any);

  const setWorksheetSelectedItems = useCallback(
    (items: Array<WorksheetItem>) => {
      setValue("worksheetItems", items as any);
    },
    [setValue]
  );

  const leftItemsOptions = useMemo(() => {
    let dbItemsRemoved =
      dbWorksheetItems?.filter((p) => {
        return !worksheetItems?.some((x) => (x as any).uuid == p.uuid);
      }) ?? [];

    let exclustions =
      (worksheetItems as Array<WorksheetItem>)?.reduce((accum0, item0) => {
        accum0[item0.testRequestItemSampleUuid] = true;
        return accum0;
      }, {}) ?? {};
    let availableItemChoices =
      dbItemOptions
        .map((entry) =>
          (entry.tests as Array<TestRequestItem>)?.map((test) => {
            let thisTestId = entry.testRequestItemSampleUuid;
            if (exclustions[thisTestId]) return null;
            return {
              sampleUuid: entry.uuid,
              testRequestItemUuid: test.uuid,
              testRequestItemSampleUuid: entry.testRequestItemSampleUuid,
              id: thisTestId,
              sampleTypeName: entry.sampleTypeName,
              sampleAccessionNumber: entry.accessionNumber,
              sampleExternalRef: entry.externalRef,
              sampleProvidedRef: entry.providedRef,
              testName: test.testName,
              testShortName: test.testShortName,
              urgency: test.urgency,
              toLocationName: test.toLocationName,
              patientIdentifier: test.patientIdentifier,
              patientGivenName: test.patientGivenName,
              patientMiddleName: test.patientMiddleName,
              patientFamilyName: test.patientFamilyName,
              referralFromFacilityName: entry.referralFromFacilityName,
              referralInExternalRef: entry.referralInExternalRef,
              isNewlySelected: true,
              testRequestNo: entry.testRequestNo,
              orderNumber: test.orderNumber,
            };
          })
        )
        ?.flatMap((p) => p)
        ?.filter((p) => p != null) ?? [];
    return availableItemChoices.concat(dbItemsRemoved as any).sort((x, y) =>
      x.sampleAccessionNumber?.localeCompare(
        y.sampleAccessionNumber,
        undefined,
        {
          ignorePunctuation: true,
        }
      )
    ) as Array<WorksheetItem>;
  }, [dbWorksheetItems, dbItemOptions, worksheetItems]);

  const onTransferItemToLeft = useCallback(
    (worksheetItem: WorksheetItem) => {
      setWorksheetSelectedItems(
        worksheetItems.filter(
          (p) =>
            !(
              p.testRequestItemSampleUuid ==
              worksheetItem.testRequestItemSampleUuid
            )
        )
      );
      let key = worksheetItem.testRequestItemSampleUuid;
      if (rightSelectedItemOptions[key]) {
        let newSelectedItemOptions = { ...rightSelectedItemOptions };
        delete newSelectedItemOptions[key];
        setRightSelectedItemOptions(newSelectedItemOptions);
      }
    },
    [rightSelectedItemOptions, setWorksheetSelectedItems, worksheetItems]
  );

  const onTransferItem = useCallback(
    (worksheetItem: WorksheetItem) => {
      let key = worksheetItem.testRequestItemSampleUuid;
      if (selectedItemOptions[key]) {
        let newSelectedItemOptions = { ...selectedItemOptions };
        delete newSelectedItemOptions[key];
        setSelectedItemOptions(newSelectedItemOptions);
      }
      let newWorksheetItem = worksheetItem?.uuid
        ? worksheetItem
        : { ...worksheetItem };
      setWorksheetSelectedItems([...worksheetItems, ...[newWorksheetItem]]);
    },
    [selectedItemOptions, setWorksheetSelectedItems, worksheetItems]
  );

  const handleTransferRight = () => {
    let exclustions = (worksheetItems as Array<WorksheetItem>)?.reduce(
      (accum0, item0) => {
        accum0[item0.testRequestItemSampleUuid] = true;
        return accum0;
      },
      {}
    );

    setValue(
      "worksheetItems",
      worksheetItems.concat(
        leftItemsOptions
          ?.map((entry) => {
            let key = entry.testRequestItemSampleUuid;
            if (!selectedItemOptions[key]?.isSelected) return null;
            if (exclustions[key]) return null;
            return entry;
          })
          .filter((p) => p != null) ?? []
      ) as any
    );

    Object.entries(selectedItemOptions).forEach(([k, v]) => {
      if (v.isSelected) {
        delete selectedItemOptions[k];
      }
    });
  };
  const handleTransferLeft = () => {
    setValue(
      "worksheetItems",
      ((worksheetItems as Array<WorksheetItem>)?.filter((p) => {
        if (p.testResultUuid) return true;
        let key = p.testRequestItemSampleUuid;
        if (rightSelectedItemOptions[key]?.isSelected) return false;
        return true;
      }) as any) ?? []
    );
    Object.entries(rightSelectedItemOptions).forEach(([k, v]) => {
      if (v.isSelected) {
        delete rightSelectedItemOptions[k];
      }
    });
  };
  const handleTransferRightAll = () => {
    let exclustions = (worksheetItems as Array<WorksheetItem>)?.reduce(
      (accum0, item0) => {
        accum0[item0.testRequestItemSampleUuid] = true;
        return accum0;
      },
      {}
    );

    setValue(
      "worksheetItems",
      worksheetItems.concat(
        leftItemsOptions
          ?.map((entry) => {
            let key = entry.testRequestItemSampleUuid;
            if (exclustions[key]) return null;
            return entry;
          })
          .filter((p) => p != null) ?? []
      ) as any
    );

    setSelectedItemOptions({});
  };
  const handleTransferLeftAll = () => {
    setValue(
      "worksheetItems",
      ((worksheetItems as Array<WorksheetItem>)?.filter(
        (p) => p.testResult?.obs
      ) as any) ?? []
    );

    setRightSelectedItemOptions({});
  };

  return (
    <div className={styles.formWrapper}>
      <form className={styles.form}>
        <div className={styles.modalBody}>
          <>
            {/* <div className={styles.errorText}>
              {Object.entries(errors).map(([key, error]) => (
                <div>
                  {key}:{JSON.stringify(error)}
                </div>
              ))}
            </div> */}
            <Tabs
              className={styles.tabs}
              onChange={({ selectedIndex }) => {
                setSelectedTab(selectedIndex);
              }}
              selectedIndex={selectedTab}
            >
              <TabList
                className={styles.tablist}
                aria-label="List tabs"
                contained
              >
                <Tab className={styles.tab}>
                  {model?.uuid
                    ? `${t("laboratoryWorksheet", "Worksheet")}: ${
                        model?.worksheetNo
                      }`
                    : t(
                        "laboratoryNewWorksheetInfo",
                        "New Worksheet Information"
                      )}
                </Tab>
                <Tab className={styles.tab}>
                  {t("laboratoryWorksheetItems", "Items")}
                </Tab>
              </TabList>
              <TabPanels>
                <TabPanel className={styles.tabPanel}>
                  <div
                    className={`${styles.panelContainer} ${styles.worksheetInfo} ${styles.inputWhite}`}
                  >
                    <div className={`${styles.panelContainer}`}>
                      {canEdit && (!locations || locations.length == 0) && (
                        <TextInputSkeleton />
                      )}
                      {canEdit && locations?.length > 0 && (
                        <Controller
                          name={"atLocationUuid"}
                          control={control}
                          render={({
                            field: { onChange, value: atLocationUuid },
                          }) => (
                            <Select
                              className={styles.textInput}
                              type="text"
                              labelText={t(
                                "laboratoryDiagonisticCenter",
                                "Lab Section"
                              )}
                              rules={{ required: true }}
                              value={atLocationUuid}
                              invalid={!!errors.atLocationUuid}
                              invalidText={errors?.atLocationUuid?.message}
                              onChange={(
                                evt: ChangeEvent<HTMLSelectElement>
                              ) => {
                                onChange(evt.target.value);
                              }}
                            >
                              {!model?.atLocationUuid && (
                                <SelectItem
                                  text={t(
                                    "laboratoryDiagonisticCenterSelect",
                                    "Select Location"
                                  )}
                                  value=""
                                />
                              )}
                              {locations?.map((location) => (
                                <SelectItem
                                  key={location.uuid}
                                  text={location.display}
                                  value={location.uuid}
                                >
                                  {location.display}
                                </SelectItem>
                              ))}
                            </Select>
                          )}
                        />
                      )}
                      {!canEdit && (
                        <TextInput
                          value={model?.atLocationName}
                          readOnly={true}
                          labelText={t(
                            "laboratoryDiagonisticCenter",
                            "Lab Section"
                          )}
                        />
                      )}
                    </div>
                    {canEdit && (
                      <Controller
                        control={control}
                        name="worksheetDate"
                        render={({ field: { onChange, value } }) => (
                          <DatePicker
                            datePickerType="single"
                            maxDate={formatForDatePicker(maxDate)}
                            locale="en"
                            dateFormat={DATE_PICKER_CONTROL_FORMAT}
                            onChange={(dates: Date[]): void => {
                              onChange(dates[0]);
                            }}
                            value={value}
                          >
                            <DatePickerInput
                              invalid={!!errors.worksheetDate}
                              invalidText={
                                errors.worksheetDate &&
                                errors?.worksheetDate?.message
                              }
                              id="worksheetDate"
                              name="worksheetDate"
                              placeholder={DATE_PICKER_FORMAT}
                              labelText={t("date", "Date")}
                              value={formatForDatePicker(value)}
                              defaultValue={value}
                            />
                          </DatePicker>
                        )}
                      />
                    )}
                    {!canEdit && (
                      <TextInput
                        value={formatDateForDisplay(model?.worksheetDate)}
                        readOnly={true}
                        labelText={t("date", "Date")}
                      />
                    )}
                    {canEdit && (
                      <>
                        <UsersSelector
                          selectedId={
                            model?.responsiblePersonUuid ?? session?.user?.uuid
                          }
                          selectedText={
                            model?.responsiblePersonFamilyName ||
                            model?.responsiblePersonMiddleName ||
                            model?.responsiblePersonGivenName
                              ? `${model?.responsiblePersonFamilyName ?? ""} ${
                                  model?.responsiblePersonMiddleName ?? ""
                                } ${
                                  model?.responsiblePersonGivenName ?? ""
                                }`.trim()
                              : session?.user?.display ?? ""
                          }
                          controllerName={`responsiblePersonUuid`}
                          name={`responsiblePersonUuid`}
                          control={control}
                          title={t(
                            "laboratoryResponsiblePerson",
                            "Responsible Person"
                          )}
                          placeholder={t("filter", "Filter ...")}
                          invalid={!!errors?.responsiblePersonUuid}
                          invalidText={errors?.responsiblePersonUuid?.message}
                        />
                        {responsibilityPersonUuid &&
                          responsibilityPersonUuid === otherUser.uuid && (
                            <ControlledTextInput
                              id="id-responsiblePersonOther"
                              name="responsiblePersonOther"
                              control={control}
                              controllerName="responsiblePersonOther"
                              maxLength={150}
                              placeholder={t("pleaseSpecify", "Please Specify")}
                              size={"sm"}
                              value={model?.responsiblePersonOther ?? ""}
                              labelText=""
                              invalid={!!errors?.responsiblePersonOther}
                              invalidText={
                                errors?.responsiblePersonOther?.message
                              }
                            />
                          )}
                      </>
                    )}
                    {!canEdit && (
                      <TextInput
                        value={
                          model?.responsiblePersonFamilyName ||
                          model?.responsiblePersonMiddleName ||
                          model?.responsiblePersonGivenName
                            ? `${model?.responsiblePersonFamilyName ?? ""} ${
                                model?.responsiblePersonMiddleName ?? ""
                              } ${
                                model?.responsiblePersonGivenName ?? ""
                              }`.trim()
                            : model?.responsiblePersonOther
                        }
                        readOnly={true}
                        labelText={t(
                          "laboratoryResponsiblePerson",
                          "Responsible Person"
                        )}
                      />
                    )}
                    {canEdit && (
                      <ControlledTextArea
                        id="remarks"
                        name="remarks"
                        control={control}
                        controllerName="remarks"
                        maxLength={500}
                        value={`${model?.remarks ?? ""}`}
                        labelText={t("remarks:", "Remarks")}
                        invalid={!!errors.remarks}
                        invalidText={errors.remarks && errors?.remarks?.message}
                      />
                    )}

                    {!canEdit && (
                      <TextArea
                        value={model?.remarks}
                        readOnly={true}
                        labelText={t("remarks:", "Remarks")}
                      />
                    )}
                  </div>
                </TabPanel>

                <TabPanel className={styles.tabPanel}>
                  <div
                    className={`${styles.panelContainer} ${styles.inputWhite}`}
                  >
                    {canEdit && (
                      <div className={`${styles.sampleFilters}`}>
                        <div className={styles.diagnosis}>
                          <TestsComboSelector
                            popUpDirection="bottom"
                            selectedId={model?.testUuid}
                            selectedText={
                              model
                                ? formatTestName(
                                    model?.testName,
                                    model?.testShortName
                                  )
                                : ""
                            }
                            controllerName={`testUuid`}
                            name={`testUuid`}
                            control={control}
                            title=""
                            onChange={(e) => {
                              setTestConcept(e?.testUuid);
                            }}
                            placeholder={t(
                              "laboratoryWorksheetDiagnosis",
                              "Any Diagnosis"
                            )}
                            invalid={!!errors?.testUuid}
                            invalidText={errors?.testUuid?.message}
                          />
                        </div>
                        <ConceptMembersSelector
                          className={styles.worksheetSampleType}
                          popUpDrirection="bottom"
                          conceptUuid={laboratorySpecimenTypeConcept}
                          selectedId={sampleType}
                          controllerName={`sampleTypeUuid`}
                          name={`sampleTypeUuid`}
                          control={control}
                          title=""
                          onChange={(e) => {
                            setSampleType(e?.uuid);
                          }}
                          placeholder={t(
                            "laboratorySpecifySampleType",
                            "Sample Type"
                          )}
                        />
                        <TextInput
                          placeholder={t(
                            "laboratoryWorksheetSampleRef",
                            "Sample #"
                          )}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            setSampleRefSearch(e.target.value);
                            debouncedSampleNumber(e.target.value);
                          }}
                          value={sampleRefSearch}
                        />
                        <Select
                          labelText=""
                          hideLabel={true}
                          className={styles.worksheetUrgency}
                          type="text"
                          placeholder={t(
                            "laboratoryWorksheetUrgency",
                            "Urgency"
                          )}
                          value={urgency}
                          onChange={(evt: ChangeEvent<HTMLSelectElement>) => {
                            setUrgency(evt.target.value);
                          }}
                        >
                          <SelectItem
                            text={t(
                              "laboratoryWorksheetAllUrgencies",
                              "All    "
                            )}
                            value=""
                          />
                          {UrgencyTypes.map((option, index) => (
                            <SelectItem
                              key={`${index}-urgency-${option}`}
                              text={option}
                              value={option}
                            />
                          ))}
                        </Select>

                        <Select
                          className={styles.worksheetLocation}
                          type="text"
                          hideLabel={true}
                          labelText={""}
                          onChange={(e) => setTestItemLocation(e.target.value)}
                          value={testItemLocation}
                        >
                          <SelectItem
                            text={t(
                              "laboratoryWorksheetDiagonisticCenter",
                              "All Lab Sections"
                            )}
                            value=""
                          />
                          {locations &&
                            locations.map((location) => (
                              <SelectItem
                                key={location.uuid}
                                text={location.display}
                                value={location.uuid}
                              >
                                {location.display}
                              </SelectItem>
                            ))}
                        </Select>
                        <PatientsSelector
                          title=""
                          placeholder={t(
                            "laboratoryWorksheetPatient",
                            "Patient"
                          )}
                          control={control}
                          controllerName="patientUuid"
                          name="patientUuid"
                          patientUuid={patientUuid}
                          onPatientUuidChange={(e) => setPatientUuid(e?.uuid)}
                        ></PatientsSelector>
                      </div>
                    )}
                  </div>
                  <div className={styles.itemSelection}>
                    {canEdit && (
                      <>
                        <div className={styles.itemSelectionOptions}>
                          <h6>
                            {t(
                              "laboratoryWorksheetAvailableSamples",
                              "Available Samples"
                            )}
                          </h6>
                          <WorksheetSampleOptionsList
                            itemOptions={leftItemsOptions}
                            onTransferItem={onTransferItem}
                            selectedItemOptions={selectedItemOptions}
                            setSelectedItemOptions={setSelectedItemOptions}
                            worksheetSelectedItems={worksheetItems}
                          />
                        </div>
                        <div className={styles.itemSelectionControls}>
                          <div className={styles.transferGroupControls}>
                            <Tooltip label={t("addSelected", "Add Selected")}>
                              <Button
                                size="lg"
                                className={styles.transferRight}
                                kind="ghost"
                                onClick={handleTransferRight}
                                renderIcon={(props) => (
                                  <ArrowShiftDown size={48} {...props} />
                                )}
                              />
                            </Tooltip>
                            <Tooltip
                              label={t("removeSelected", "Remove Selected")}
                            >
                              <Button
                                size="lg"
                                className={styles.transferLeft}
                                kind="ghost"
                                onClick={handleTransferLeft}
                                renderIcon={(props) => (
                                  <ArrowShiftDown size={48} {...props} />
                                )}
                              />
                            </Tooltip>
                          </div>
                          <div className={styles.transferGroupControls}>
                            <Tooltip label={t("addAll", "Add All")}>
                              <Button
                                size="lg"
                                className={styles.transferRightAll}
                                kind="ghost"
                                onClick={handleTransferRightAll}
                                renderIcon={(props) => (
                                  <CallsIncoming size={48} {...props} />
                                )}
                              />
                            </Tooltip>
                            <Tooltip label={t("removeAll", "Remove All")}>
                              <Button
                                size="lg"
                                kind="ghost"
                                className={styles.transferLeftAll}
                                onClick={handleTransferLeftAll}
                                renderIcon={(props) => (
                                  <CallsIncoming size={48} {...props} />
                                )}
                              />
                            </Tooltip>
                          </div>
                        </div>
                      </>
                    )}
                    <div className={styles.itemSelectedItems}>
                      <h6>
                        {t("laboratoryWorksheetSamples", "Worksheet Samples")}
                        {errors?.worksheetItems?.message && (
                          <span className={styles.errorText}>
                            {" ("}
                            {errors?.worksheetItems?.message}
                            {")"}
                          </span>
                        )}
                      </h6>
                      <WorksheetItemsList
                        canEdit={canEdit}
                        onTransferItem={onTransferItemToLeft}
                        selectedItemOptions={rightSelectedItemOptions}
                        setSelectedItemOptions={setRightSelectedItemOptions}
                        worksheetSelectedItems={worksheetItems}
                      />
                    </div>
                  </div>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </>
        </div>
        <div className={styles.modalFooter}>
          <Button
            disabled={isSaving}
            onClick={() =>
              navigate({
                to: URL_LAB_WORKSHEET_ABS,
              })
            }
            kind="secondary"
          >
            {t("cancel", "Cancel")}
          </Button>
          {canEdit && (
            <Button
              onClick={handleSubmit(handleSave, handleInvalid)}
              disabled={isSaving}
            >
              {isSaving ? <InlineLoading /> : t("save", "Save")}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

export default EditWorksheet;
