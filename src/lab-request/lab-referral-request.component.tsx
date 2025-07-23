import React, { useState, useEffect } from "react";
import {
  showNotification,
  showSnackbar,
  useSession,
  FetchResponse,
  navigate,
  userHasAccess,
} from "@openmrs/esm-framework";
import {
  InlineLoading,
  Button,
  DatePicker,
  DatePickerInput,
  RadioButtonGroup,
  RadioButton,
  Tab,
  Tabs,
  TabList,
  TabPanel,
  TabPanels,
} from "@carbon/react";
import styles from "./lab-referral-request.component.scss";
import { useTranslation } from "react-i18next";
import {
  DATE_PICKER_CONTROL_FORMAT,
  DATE_PICKER_FORMAT,
  formatAsPlainDateForTransfer,
  formatForDatePicker,
  today,
} from "../utils/date-utils";
import { LabRequest } from "../api/types/lab-request";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, Control } from "react-hook-form";
import {
  LabRequestFormData,
  LabRequestSchema,
} from "./lab-referral-request-validation-schema";
import ControlledTextArea from "../components/controlled-text-area/controlled-text-area.component";
import { UrgencyTypes } from "../api/types/urgency";
import { createTestRequest } from "../api/test-request.resource";
import {
  MODULE_BASE_URL,
  URL_API_ENCOUNTER,
  URL_API_ORDER,
  URL_API_TEST_REQUEST,
} from "../config/urls";
import { handleMutate } from "../api/swr-revalidation";
import { ILaboratoryNavigationProps } from "../header/laboratory-navigation";
import { getUniqueId } from "../utils/string-utils";
import { DiagonisticCenterTests, Sample } from "../api/types/sample";
import { extractErrorMessagesFromResponse } from "../utils/functions";
import SampleItemsTable from "./lab-referral-request-samples.component";
import ReferrerLocationSelector from "../components/referral-locations-selector/referral-locations-selector.component";
import ControlledTextInput from "../components/controlled-text-input/controlled-text-input.component";
import { TASK_LABMANAGEMENT_REPOSITORY_MUTATE } from "../config/privileges";

export interface LabReferralRequestProps extends ILaboratoryNavigationProps {
  model?: LabRequest | null;
}

const LabRequest: React.FC<LabReferralRequestProps> = ({
  onPageChanged,
  model,
}) => {
  const { t } = useTranslation();
  const [canArchiveSamples, setCanArchiveSamples] = useState(false);

  const maxDate: Date = today();
  const [selectedTab, setSelectedTab] = useState(0);

  const session = useSession();
  useEffect(() => {
    setCanArchiveSamples(
      session?.user &&
        userHasAccess(TASK_LABMANAGEMENT_REPOSITORY_MUTATE, session.user)
    );
  }, [session.user]);

  useEffect(
    () => {
      onPageChanged({
        showDateInHeader: false,
        title: t("laboratoryReferralConfigHeaderTitle", "Referral Request"),
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const {
    handleSubmit,
    control,
    formState,
    watch,
    setValue,
    getValues,
    setFocus,
  } = useForm<LabRequestFormData>({
    defaultValues: {
      ...(model ?? {}),
      ...(model?.requestDate ? {} : { requestDate: today() }),
      ...{
        samples: new Array<Sample>({
          uuid: `new-item-${getUniqueId()}`,
          tests: {},
          archiveSample: false,
        } as any as Sample),
      },
    },
    mode: "all",
    resolver: zodResolver(LabRequestSchema),
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (record: any) => {
    let item = record as LabRequest;
    try {
      let samples = item.samples
        .map((p) => {
          if (
            Boolean(
              !p.sampleTypeUuid &&
                !p.externalRef &&
                !p.accessionNumber &&
                !Boolean(
                  p.tests &&
                    Object.entries(
                      p.tests as any as DiagonisticCenterTests
                    ).some(([k, v]) => v?.tests?.length > 0)
                )
            )
          ) {
            return null;
          }
          let sampleToReturn = {
            sampleTypeUuid: p.sampleTypeUuid,
            accessionNumber: p.accessionNumber,
            externalRef: p.externalRef,
            tests: Object.entries(p.tests as DiagonisticCenterTests)
              .map(([, value]) =>
                value.tests?.map((test) => {
                  return {
                    testUuid: test.testUuid,
                    locationUuid: value.center.uuid,
                  };
                })
              )
              .flatMap((p) => p.filter((x) => x)),
          };
          if (p["archiveSample"]) {
            sampleToReturn["archive"] = true;
            sampleToReturn["storageUnitUuid"] = p["storageUnitUuid"];
          }
          return sampleToReturn;
        })
        .filter((p) => p != null);

      let requestItem = {
        atLocationUuid: session.sessionLocation?.uuid,
        requestDate: formatAsPlainDateForTransfer(item.requestDate),
        clinicalNote: item.clinicalNote,
        urgency: item.urgency,
        referralFromFacilityUuid: item.referralFromFacilityUuid,
        referralInExternalRef: item.referralInExternalRef,
        samples: samples,
        referredIn: true,
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
          title: t("laboratoryAddReferralTestRequest", "Add Referral Request"),
          kind: "success",
          subtitle: t(
            "laboratoryAddReferralTestRequestSuccess",
            "Referral Request Added Successfully"
          ),
        });
        navigate({ to: MODULE_BASE_URL });
      }
    } catch (error) {
      setIsSaving(false);
      showNotification({
        title: t(
          "laboratoryAddReferralTestRequestError",
          "Error adding referral request"
        ),
        kind: "error",
        critical: true,
        description: error?.message,
      });
    }
  };

  const { errors } = formState;

  const handleInvalid = async (errors2) => {
    showSnackbar({
      isLowContrast: true,
      title: t("laboratoryLabRequestSubmitError", "Error saving lab request"),
      kind: "error",
      subtitle: "Check and complete the required fields",
      autoClose: true,
    });
  };

  const samples = watch("samples");

  return (
    <div className={styles.formWrapper}>
      <form className={styles.form}>
        <div className={styles.modalBody}>
          <>
            {/* <div className={styles.errorText}>
              {Object.entries(errors).map(([key, error]) => (
                <div>
                  {key}:{error.message}
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
                  {t("laboratoryReferralTestsInfo", "Referral Information")}
                </Tab>
                <Tab className={styles.tab}>
                  {t("laboratoryReferralSamples", "Samples")}
                </Tab>
              </TabList>
              <TabPanels>
                <TabPanel className={styles.tabPanel}>
                  <div
                    className={`${styles.panelContainer} ${styles.referralInfo}`}
                  >
                    <ReferrerLocationSelector
                      selectedId={model?.referralFromFacilityUuid}
                      selectedText={model?.referralFromFacilityName}
                      controllerName={"referralFromFacilityUuid"}
                      name="referralFromFacilityUuid"
                      control={control}
                      title={t("locationReferral", "Reference Location:")}
                      placeholder={t("chooseAnItem", "Choose an item")}
                      invalid={!!errors.referralFromFacilityUuid}
                      invalidText={
                        errors.referralFromFacilityUuid &&
                        errors?.referralFromFacilityUuid?.message
                      }
                      referrerIn={true}
                    />
                  </div>
                  <div>
                    <section
                      className={`${styles.section} ${styles.inputWhite}`}
                    >
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
                                errors.requestDate &&
                                errors?.requestDate?.message
                              }
                              id="requestDate"
                              name="requestDate"
                              placeholder={DATE_PICKER_FORMAT}
                              labelText={t("date", "Date")}
                              value={formatForDatePicker(value)}
                              defaultValue={value}
                            />
                          </DatePicker>
                        )}
                      />
                      <div
                        className={`${styles["clear-margin-padding-top-bottom"]} ${styles.horizontalRadioButtons}`}
                      >
                        <div className={`${styles.radioLabel} cds--label`}>
                          {t("laboratoryRequestUrgency", "Urgency")}
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
                      <div
                        className={`${styles.panelContainer} ${styles.referralInfo}`}
                      >
                        <ControlledTextInput
                          id={`id-referralInExternalRef`}
                          name="referralInExternalRef"
                          control={control}
                          controllerName="referralInExternalRef"
                          maxLength={50}
                          size={"sm"}
                          value={model?.referralInExternalRef ?? ""}
                          labelText={t(
                            "laboratoryReferralReferenceNumber:",
                            "Referral Reference Number"
                          )}
                          invalid={!!errors?.referralInExternalRef}
                          invalidText={
                            errors?.referralInExternalRef &&
                            errors?.referralInExternalRef?.message
                          }
                        />
                      </div>
                      <ControlledTextArea
                        id="clinicalNote"
                        name="clinicalNote"
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
                    </section>
                  </div>
                </TabPanel>

                <TabPanel className={styles.tabPanel}>
                  <div className={styles.panelContainer}>
                    <SampleItemsTable
                      items={samples as Sample[]}
                      canEdit={true}
                      errors={errors}
                      control={
                        control as any as Control<LabRequest, LabRequest>
                      }
                      getValue={getValues}
                      setValue={setValue}
                      setFocus={setFocus}
                      watch={watch}
                      canArchiveSamples={canArchiveSamples}
                    />
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
                to: MODULE_BASE_URL,
              })
            }
            kind="secondary"
          >
            {t("cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleSubmit(handleSave, handleInvalid)}
            disabled={isSaving}
          >
            {isSaving ? <InlineLoading /> : t("save", "Save")}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default LabRequest;
