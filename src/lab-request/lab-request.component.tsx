import React, {
  useMemo,
  useState,
  useEffect,
  ChangeEvent,
  useCallback,
} from "react";
import {
  ExtensionSlot,
  Patient,
  showNotification,
  showSnackbar,
  useLocations,
  useSession,
  Location as DiagonisticCenter,
  showModal,
  FetchResponse,
} from "@openmrs/esm-framework";
import { TrashCan, Add, View } from "@carbon/react/icons";
import {
  InlineLoading,
  TextInputSkeleton,
  FilterableMultiSelect,
  Select,
  SelectItem,
  Button,
  DatePicker,
  DatePickerInput,
  ModalBody,
  ModalFooter,
  RadioButtonGroup,
  RadioButton,
  Checkbox,
  DataTableSkeleton,
} from "@carbon/react";
import styles from "./lab-request.component.scss";
import { useTestConfigs } from "../api/test-config.resource";
import { useTranslation } from "react-i18next";
import { TestConfig } from "../api/types/test-config";
import {
  DATE_PICKER_CONTROL_FORMAT,
  DATE_PICKER_FORMAT,
  formatAsPlainDateForTransfer,
  formatForDatePicker,
  today,
} from "../utils/date-utils";
import ProviderSelector from "../components/provider-selector/provider-selector.component";
import { LabRequest } from "../api/types/lab-request";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import {
  LabRequestFormData,
  LabRequestSchema,
} from "./lab-request-validation-schema";
import ControlledTextArea from "../components/controlled-text-area/controlled-text-area.component";
import { UrgencyTypes } from "../api/types/urgency";
import CareSettingRadioButtonGroup from "../components/care-setting-selector/care-seeting-radio-button-group.component";
import { createTestRequest } from "../api/test-request.resource";
import {
  URL_API_ENCOUNTER,
  URL_API_ORDER,
  URL_API_TEST_REQUEST,
} from "../config/urls";
import { handleMutate } from "../api/swr-revalidation";
import LocationTests from "../components/tests-selector/location-tests.component";
import PatientHeaderInfo from "../components/patient-header-info/patient-header-info.component";
import { useLaboratoryConfig } from "../hooks/useLaboratoryConfig";
import { CloseWorkspaceOptions } from "@openmrs/esm-styleguide/src/workspaces/workspaces";

export interface LabRequestProps {
  patientUuid?: string;
  closeWorkspace?: (closeWorkspaceOptions?: CloseWorkspaceOptions) => void;
  promptBeforeClosing?: (testFcn: () => boolean) => void;
  mode: "patient" | "other";
  model?: LabRequest | null;
}

const LabRequest: React.FC<LabRequestProps> = ({
  patientUuid,
  mode,
  closeWorkspace,
  model,
}) => {
  const { t } = useTranslation();
  const {
    laboratoryConfig: { laboratoryLocationTag },
  } = useLaboratoryConfig();
  const locations = useLocations(laboratoryLocationTag);
  const [patient, setPatient] = useState<Patient>();
  const [preferredLocation, setPreferredLocation] = useState<string>();
  const [renderMultiSelect, setRenderMultiSelect] = useState<number>(100); // Hack to work around clearing the multiselect
  const [selectedItems, setSelectedItems] = useState<TestConfig[]>([]);

  const maxDate: Date = today();
  const [locationTests, setLocationTests] = useState<{
    [key: string]: { center: DiagonisticCenter; tests: Array<TestConfig> };
  }>({});
  const [availableTests, setAvailableTests] = useState<Array<TestConfig>>();
  const [selectedPatientUuid, setSelectedPatientUuid] = useState(
    () => model?.patientUuid ?? patientUuid
  );

  const session = useSession();

  const { handleSubmit, control, formState, setValue } =
    useForm<LabRequestFormData>({
      defaultValues: {
        ...(model ?? {}),
        ...(model?.requestDate ? {} : { requestDate: today() }),
        ...(model?.patientUuid
          ? {}
          : mode == "patient"
          ? { patientUuid: patientUuid }
          : {}),
        ...(model?.providerUuid
          ? {}
          : mode == "patient"
          ? session.currentProvider?.uuid
            ? { providerUuid: session.currentProvider?.uuid }
            : {}
          : {}),
        requireRequestReason: mode === "other",
      },
      mode: "all",
      resolver: zodResolver(LabRequestSchema),
    });

  const {
    items: { results: testOptions },
    isLoading: isLoadingTestOptions,
  } = useTestConfigs({ active: true });

  const onSelectionChanged = (value: TestConfig[]) => {
    setSelectedItems(value);
  };

  useEffect(() => {
    if (!preferredLocation && locations?.length > 0) {
      if (locations.length == 1) {
        setPreferredLocation(locations[0].uuid);
      } else if (session?.sessionLocation?.uuid) {
        let currentLocation = locations?.find(
          (p) => p.uuid == session?.sessionLocation?.uuid
        );
        if (currentLocation) {
          setPreferredLocation(currentLocation.uuid);
        }
      }
    }
  }, [locations, preferredLocation, session?.sessionLocation?.uuid]);

  const onPreferredLocationChange = (evt: ChangeEvent<HTMLSelectElement>) => {
    setPreferredLocation(evt.target.value);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (item: LabRequest) => {
    try {
      let tests = Object.entries(locationTests)
        .map(([, value]) =>
          value.tests.map((test) => {
            return {
              testUuid: test.testUuid,
              locationUuid: value.center.uuid,
              referredOut: Boolean(test["referOut"]),
            };
          })
        )
        .flatMap((p) => p);

      let currentSelectedTests = selectedItems.map((test) => {
        return {
          testUuid: test.testUuid,
          locationUuid: preferredLocation,
          referredOut: Boolean(test["referOut"]),
        };
      });
      let requestItem = {
        atLocationUuid: session.sessionLocation?.uuid,
        providerUuid: item.providerUuid,
        requestDate: formatAsPlainDateForTransfer(item.requestDate),
        clinicalNote: item.clinicalNote,
        requestReason: item.requestReason,
        patientUuid: selectedPatientUuid,
        referredIn: false,
        urgency: item.urgency,
        careSettingUuid: item.careSettingUuid,
        tests: [...tests, ...currentSelectedTests],
      };
      setIsSaving(true);
      const response: FetchResponse<LabRequest> = await createTestRequest(
        requestItem
      );

      handleMutate(URL_API_ORDER);
      handleMutate(URL_API_ENCOUNTER);
      handleMutate(URL_API_TEST_REQUEST);

      if (response?.data) {
        showSnackbar({
          isLowContrast: true,
          title: t("laboratoryAddTestRequest", "Add Test Request"),
          kind: "success",
          subtitle: t(
            "laboratoryAddTestRequestSuccess",
            "Test Request Added Successfully"
          ),
        });

        closeWorkspace({ ignoreChanges: true });
      }
    } catch (error) {
      setIsSaving(false);
      showNotification({
        title: t("laboratoryAddTestRequestError", "Error adding test request"),
        kind: "error",
        critical: true,
        description: error?.responseBody?.error?.message,
      });
    }
  };

  const addSelectedToLoctionTests = () => {
    if (selectedItems.length > 0) {
      let tmpLocationTest = { ...locationTests };
      if (!tmpLocationTest[preferredLocation]) {
        tmpLocationTest[preferredLocation] = {
          center: locations.find((p) => p.uuid == preferredLocation),
          tests: new Array(),
        };
      }
      tmpLocationTest[preferredLocation].tests = [
        ...new Set([
          ...tmpLocationTest[preferredLocation].tests,
          ...selectedItems,
        ]),
      ];
      setLocationTests(tmpLocationTest);
      setSelectedItems([]);
      setRenderMultiSelect((s) => s + 1);
    }
  };

  useEffect(() => {
    let testsToExclude = new Set(
      Object.entries(locationTests)
        .map(([, v]) => v.tests.map((x) => x.uuid))
        .flatMap((p) => p)
    );
    setAvailableTests(
      testOptions?.filter((p) => !testsToExclude.has(p.uuid)) ?? []
    );
    setRenderMultiSelect((s) => s + 1);
  }, [locationTests, testOptions]);

  const viewAllTests = useCallback(() => {
    const dispose = showModal("lab-request-test-select-dialog", {
      closeModal: () => dispose(),
      availableTests: availableTests,
      initialSelection: selectedItems,
      onSelectionComplete: (selectedItems) => {
        setSelectedItems([...selectedItems]);
        setRenderMultiSelect((s) => s + 1);
        dispose();
      },
    });
  }, [availableTests, selectedItems]);

  const onSelectPatient = useCallback(
    (patientUuid: string) => {
      if (patientUuid) {
        setSelectedPatientUuid(patientUuid);
        setValue("patientUuid", patientUuid);
      }
    },
    [setValue]
  );

  const patientSearchState = useMemo(() => {
    return {
      selectPatientAction: onSelectPatient,
      initialSearchTerm: "",
    };
  }, [onSelectPatient]);

  const onCareSettingSetDefaultValue = (uuid: string) => {
    setValue("careSettingUuid", uuid);
  };

  const { errors } = formState;

  const handleInvalid = async () => {
    showSnackbar({
      isLowContrast: true,
      title: t("laboratoryLabRequestSubmitError", "Error saving lab request"),
      kind: "error",
      subtitle: "Check and complete the required fields",
      autoClose: true,
    });
  };

  return (
    <div className={styles.formWrapper}>
      <form className={styles.form}>
        <ModalBody className={styles.modalBody}>
          {mode !== "patient" && (
            <>
              <div className={styles.patientSearch}>
                <ExtensionSlot
                  name="patient-search-bar-slot"
                  state={patientSearchState}
                />
              </div>
              {selectedPatientUuid && (
                <PatientHeaderInfo
                  key={selectedPatientUuid}
                  patientUuid={selectedPatientUuid}
                  onPatientChange={setPatient}
                />
              )}
            </>
          )}
          {/* <div className={styles.errorText}>
            {Object.entries(errors).map(([key, error]) => (
              <div>
                {key}:{error.message}
              </div>
            ))}
          </div> */}

          {selectedPatientUuid && (
            <div>
              <section className={`${styles.section} ${styles.inputWhite}`}>
                <Controller
                  control={control}
                  name="requestDate"
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
                        invalid={!!errors.requestDate}
                        invalidText={
                          errors.requestDate && errors?.requestDate?.message
                        }
                        id="requestDate"
                        name="requestDate"
                        placeholder={DATE_PICKER_FORMAT}
                        labelText={t("laboratoryRequestDate", "Date:")}
                        value={formatForDatePicker(value)}
                        defaultValue={value}
                      />
                    </DatePicker>
                  )}
                />
                <div className={styles.urgencyContainer}>
                  <div
                    className={`${styles["clear-margin-padding-top-bottom"]} ${styles.horizontalRadioButtons}`}
                  >
                    <div className={`${styles.radioLabel} cds--label`}>
                      {t("laboratoryRequestUrgency", "Urgency:")}
                      {errors.urgency && errors?.urgency?.message && (
                        <div className={styles.errorText}>
                          {t(errors?.urgency?.message)}
                        </div>
                      )}
                    </div>
                    <Controller
                      name={"urgency"}
                      control={control}
                      render={({ field: { onChange, value, ref } }) => (
                        <RadioButtonGroup
                          id={"urgency"}
                          name="urgency"
                          invalid={!!errors.urgency}
                          invalidText={
                            errors.urgency && errors?.urgency?.message
                          }
                          legendText=""
                          value={value}
                          ref={ref}
                          defaultSelected={model?.urgency}
                          onChange={onChange}
                        >
                          {UrgencyTypes.map((option, index) => (
                            <RadioButton
                              key={`${index}-urgency-${option}`}
                              id={`urgency-${option}`}
                              labelText={option}
                              value={option}
                              checked={value === option}
                              onChange={() => onChange(option)}
                              ref={ref}
                            />
                          ))}
                        </RadioButtonGroup>
                      )}
                    />
                  </div>

                  <CareSettingRadioButtonGroup
                    control={control}
                    defaultSelected={model?.careSettingUuid}
                    name="careSettingUuid"
                    controllerName="careSettingUuid"
                    labelText={t(
                      "laboratoryRequestCareSettingEdit",
                      "Care Setting:"
                    )}
                    invalid={!!errors.careSettingUuid}
                    onChange={() => {}}
                    preselectForPatientUuid={selectedPatientUuid}
                    onRequestChange={onCareSettingSetDefaultValue}
                    invalidText={
                      errors.careSettingUuid && errors?.careSettingUuid?.message
                    }
                  />
                </div>
                <ProviderSelector
                  className={styles.formField}
                  selectedId={
                    model?.providerUuid ??
                    (model?.uuid || mode != "patient"
                      ? null
                      : session.currentProvider?.uuid)
                  }
                  selectedText={
                    model?.providerName ??
                    (model?.uuid || mode != "patient"
                      ? null
                      : session.currentProvider?.uuid
                      ? `${session.currentProvider.identifier} ${session.user?.display}`
                      : null)
                  }
                  controllerName={"providerUuid"}
                  name="providerUuid"
                  control={control}
                  title={t("laboratoryRequestProviderEdit", "Provider:")}
                  placeholder={t("chooseAProvider", "Choose a provider")}
                  invalid={!!errors.providerUuid}
                  invalidText={
                    errors.providerUuid && errors?.providerUuid?.message
                  }
                />
                <ControlledTextArea
                  id="clinicalNote"
                  name="clinicalNote"
                  rows={2}
                  control={control}
                  controllerName="clinicalNote"
                  maxLength={500}
                  value={`${model?.clinicalNote ?? ""}`}
                  labelText={t("clinicalNote:", "Clinical Notes")}
                  invalid={!!errors.clinicalNote}
                  invalidText={
                    errors.clinicalNote && errors?.clinicalNote?.message
                  }
                />
                {mode == "other" && (
                  <ControlledTextArea
                    id="requestReason"
                    name="requestReason"
                    rows={1}
                    control={control}
                    controllerName="requestReason"
                    maxLength={500}
                    value={`${model?.requestReason ?? ""}`}
                    labelText={t("requestReason:", "Request Reason")}
                    invalid={!!errors.requestReason}
                    invalidText={
                      errors.requestReason && errors?.requestReason?.message
                    }
                  />
                )}
              </section>

              {Object.entries(locationTests).map(([key, value]) => (
                <section key={key} className={styles.locationLabRequest}>
                  <LocationTests
                    readonly={false}
                    center={value.center}
                    tests={value.tests}
                    showLocation={true}
                    deleteAllTests={(center) => {
                      let newLocations = { ...locationTests };
                      delete newLocations[center.uuid];
                      setLocationTests(newLocations);
                    }}
                    deleteTest={(center, test) => {
                      let newLocations = { ...locationTests };
                      if (value.tests.length < 2) {
                        delete newLocations[center.uuid];
                      } else {
                        newLocations[center.uuid].tests = newLocations[
                          center.uuid
                        ].tests.filter((p) => p.uuid != test.uuid);
                      }
                      setLocationTests(newLocations);
                      setRenderMultiSelect((s) => s + 1);
                    }}
                    enableReferOut={true}
                    referOut={(center, test) => {
                      let newValue = Boolean(!test["referOut"]);
                      setLocationTests((draft) => {
                        let draftCopy = { ...draft };
                        draftCopy[center.uuid].tests.find(
                          (p) => p.uuid == test.uuid
                        )["referOut"] = newValue;
                        return draftCopy;
                      });
                    }}
                  />
                </section>
              ))}
              <section className={styles.locationLabRequest}>
                {(!locations || locations.length == 0) && <TextInputSkeleton />}
                {locations?.length > 0 && (
                  <Select
                    className={styles.textInput}
                    type="text"
                    labelText={t("laboratoryDiagonisticCenter", "Lab Section")}
                    rules={{ required: true }}
                    value={preferredLocation ?? ""}
                    onChange={onPreferredLocationChange}
                  >
                    {!preferredLocation && (
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

                {preferredLocation && (
                  <div className={styles.labRequests}>
                    <div className={`cds--label ${styles.labRequestsHeader}`}>
                      <span>Lab Request(s):</span>
                      <Button
                        kind="ghost"
                        onClick={viewAllTests}
                        renderIcon={(props) => <View size={16} {...props} />}
                      >
                        {t("LaboratoryAllTests", "All Tests")}
                      </Button>
                    </div>

                    {isLoadingTestOptions && <TextInputSkeleton />}
                    {availableTests && (
                      <>
                        <div className={styles.selectedTests}>
                          {selectedItems?.map((test, index) => (
                            <div
                              className={`${styles.selectedTest} ${
                                selectedItems.length % 2 == 0
                                  ? index % 2 == 0
                                    ? styles.selectedTestAltRow
                                    : ""
                                  : index % 2 == 1
                                  ? styles.selectedTestAltRow
                                  : ""
                              }`}
                            >
                              <div className={styles.selectedTestName}>
                                <span>
                                  {index + 1}
                                  {"."}&nbsp;
                                </span>
                                <span>
                                  {test?.testShortName
                                    ? `${test?.testShortName}${
                                        test?.testName
                                          ? ` (${test.testName})`
                                          : ""
                                      }`
                                    : test?.testName}
                                </span>
                              </div>
                              <div className={styles.referOut}>
                                <Checkbox
                                  checked={test["referOut"]}
                                  onChange={(e) => {
                                    let newValue = Boolean(!test["referOut"]);
                                    setSelectedItems((draft) => {
                                      let draftCopy = [...draft];
                                      draftCopy.find(
                                        (p) => p.uuid == test.uuid
                                      )["referOut"] = newValue;
                                      return draftCopy;
                                    });
                                  }}
                                  className={styles.testGroupItem}
                                  labelText={t("referOut", "Refer-Out")}
                                  id={`test-chk-${test.uuid}`}
                                />
                                <Button
                                  kind="ghost"
                                  onClick={() => {
                                    setSelectedItems(
                                      selectedItems?.filter(
                                        (p) => p.uuid != test.uuid
                                      )
                                    );
                                    setRenderMultiSelect((s) => s + 1);
                                  }}
                                  renderIcon={(props) => (
                                    <TrashCan size={16} {...props} />
                                  )}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        {selectedItems?.length > 0 && (
                          <div>
                            <Button
                              size="sm"
                              iconDescription="Add"
                              hasIcon={true}
                              renderIcon={(props) => (
                                <Add {...props} size={16} />
                              )}
                              kind="ghost"
                              onClick={addSelectedToLoctionTests}
                            >
                              {t(
                                "laboratoryAddForAnotherLocation",
                                "Add For Other Lab Section"
                              )}
                            </Button>
                          </div>
                        )}
                        <div
                          className={`${styles.multiSelectedCombo}`}
                          style={{ backgroundColor: "white" }}
                        >
                          <FilterableMultiSelect
                            downshiftProps={{
                              inputId: "labRequestMultiSelectedCombo",
                            }}
                            key={renderMultiSelect}
                            direction="top"
                            id="cbLabRequestOptions"
                            titleText=""
                            placeholder={t(
                              "laboratoryRequestChooseTests",
                              "Choose tests"
                            )}
                            initialSelectedItems={selectedItems}
                            selectedItems={selectedItems}
                            onChange={(data) =>
                              onSelectionChanged(data.selectedItems)
                            }
                            items={availableTests}
                            itemToString={(item?: TestConfig) =>
                              (item?.testShortName
                                ? `${item?.testShortName}${
                                    item?.testName ? ` (${item.testName})` : ""
                                  }`
                                : item?.testName) ?? ""
                            }
                            selectionFeedback="top-after-reopen"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}
        </ModalBody>

        <ModalFooter className={styles.modalFooter}>
          <Button
            disabled={isSaving}
            onClick={() => closeWorkspace({ ignoreChanges: true })}
            kind="secondary"
          >
            {t("cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleSubmit(handleSave, handleInvalid)}
            disabled={
              selectedItems?.length == 0 &&
              Object.keys(selectedItems).length == 0
            }
          >
            {isSaving ? <InlineLoading /> : t("save", "Save")}
          </Button>
        </ModalFooter>
      </form>
    </div>
  );
};

const LabRequestWrapper: React.FC<LabRequestProps> = ({
  patientUuid,
  mode,
  closeWorkspace,
  model,
}) => {
  const { configReady } = useLaboratoryConfig();

  if (!configReady) return <DataTableSkeleton role="progressbar" />;
  return (
    <LabRequest
      patientUuid={patientUuid}
      mode={mode}
      closeWorkspace={closeWorkspace}
      model={model}
    />
  );
};

export default LabRequestWrapper;
