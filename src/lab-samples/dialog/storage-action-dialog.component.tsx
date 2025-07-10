import React, { ReactNode, useEffect, useState } from "react";

import {
  Button,
  Form,
  ModalBody,
  ModalFooter,
  InlineLoading,
  DatePicker,
  DatePickerInput,
  Tag,
  TextInput,
} from "@carbon/react";
import { useTranslation } from "react-i18next";
import styles from "./storage-action-dialog.scss";
import {
  showNotification,
  showSnackbar,
  useSession,
} from "@openmrs/esm-framework";
import { extractErrorMessagesFromResponse } from "../../utils/functions";
import { Controller, useForm } from "react-hook-form";
import {
  StorageActionFormData,
  StorageActionSchema,
} from "./storage-action-validation-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import ControlledTextArea from "../../components/controlled-text-area/controlled-text-area.component";
import {
  DATE_PICKER_CONTROL_FORMAT,
  DATE_PICKER_FORMAT,
  formatAsPlainDateForTransfer,
  formatForDatePicker,
  today,
} from "../../utils/date-utils";
import UsersSelector from "../../components/users-selector/users-selector.component";
import ControlledTextInput from "../../components/controlled-text-input/controlled-text-input.component";
import { otherUser } from "../../api/users.resource";
import ControlledStorageSelector from "../../components/storage/controlled-storage-selector.component";
import ControlledStorageUnitSelector from "../../components/storage/controlled-storage-unit-selector.component";
import { Sample } from "../../api/types/sample";
import ControlledNumberInput from "../../components/controlled-text-input/controlled-number-input.component";
import ConceptMembersSelector from "../../components/concepts-selector/concept-members-selector.component";
import { useLaboratoryConfig } from "../../hooks/useLaboratoryConfig";
import { TestRequestAction } from "../../api/types/test-request";
import { SampleReferenceDisplay } from "../../components/sample-reference-display";
import { ApprovalActionApproved } from "../../api/types/approval-action";
import { getSampleEntityName } from "../../components/test-request/entity-name";

interface StorageActionDialogProps {
  actionTitle: ReactNode;
  approvalDescription: ReactNode;
  closeModal?: (success: boolean) => void;
  remarksTextLabel: string;
  remarksRequired: boolean;
  storageUnitRequired: boolean;
  hideRemarks?: boolean;
  actionButtonLabel: string;
  onSaveCallback: (sampleAction: TestRequestAction) => Promise<object>;
  kind?: string;
  successMessageTitle: string;
  successMessageBody: string;
  sample?: Sample;
  readonlyStorage?: boolean;
  multiSamples?: boolean;
  sampleInformation?: React.ReactNode;
  defaultThawCycles?: number;
}

const StorageActionDialog: React.FC<StorageActionDialogProps> = ({
  actionTitle,
  approvalDescription,

  closeModal,
  remarksTextLabel,
  actionButtonLabel,
  remarksRequired,
  onSaveCallback: approveCallback,
  successMessageTitle,
  successMessageBody,
  kind,
  storageUnitRequired,
  sample,
  readonlyStorage,
  multiSamples,
  sampleInformation,
  defaultThawCycles,
}) => {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const maxDate: Date = today();
  const session = useSession();
  const {
    laboratoryConfig: { laboratoryVolumeMeasurementTypeConcept },
  } = useLaboratoryConfig();

  const { handleSubmit, control, formState, setFocus, watch, setValue } =
    useForm<StorageActionFormData>({
      defaultValues: {
        remarksRequired: remarksRequired ?? false,
        remarks: "",
        storageUnitRequired: storageUnitRequired ?? false,
        specifyVolume: false,
        responsiblePersonUuid: session?.user?.uuid,
        actionDate: today(),
        volume: sample?.volume,
        volumeUnitUuid: sample?.volumeUnitUuid,
        thawCycles: defaultThawCycles ?? null,
      },
      mode: "all",
      resolver: zodResolver(StorageActionSchema),
    });

  const { errors } = formState;

  const handleSave = async (record: StorageActionFormData) => {
    try {
      let sampleAction: TestRequestAction = {
        action: ApprovalActionApproved,
        actionDate: formatAsPlainDateForTransfer(record.actionDate),
        remarks: record.remarks,
        parameters: {
          thawCycles: record.thawCycles != 0 ? record.thawCycles : undefined,
          volume: record.volume != 0 ? record.volume : undefined,
          volumeUnitUuid: record.volumeUnitUuid,
          responsiblePersonUuid:
            record.responsiblePersonUuid == otherUser.uuid
              ? null
              : record.responsiblePersonUuid,
          responsiblePersonOther: record.responsiblePersonOther,
        },
      };
      if (storageUnitRequired) {
        sampleAction.parameters = {
          ...sampleAction.parameters,
          storageUnitUuid: record.storageUnitUuid,
        };
      }

      setIsSaving(true);
      await approveCallback(sampleAction);
      showSnackbar({
        isLowContrast: true,
        title: successMessageTitle,
        kind: "success",
        subtitle: successMessageBody,
      });
      closeModal(true);
    } catch (error) {
      setIsSaving(false);
      showNotification({
        title: t(
          "laboratoryTestRequestApproveActionError",
          "Error performing action"
        ),
        kind: "error",
        critical: true,
        description: error?.message,
      });
    }
  };

  const responsibilityPersonUuid = watch("responsiblePersonUuid");
  const storageUuid = watch("storageUuid");

  useEffect(() => {
    setFocus("remarks");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInvalid = async (errors2) => {
    showSnackbar({
      isLowContrast: true,
      title: t("laboratoryLabRequestSubmitError", "Error saving lab request"),
      kind: "error",
      subtitle: "Check and complete the required fields",
      autoClose: true,
    });
  };

  return (
    <div className="elevate-above-grid">
      <Form>
        <ModalBody>
          <div className={styles.modalBody}>
            <section className={styles.section}>
              <div className={styles.sectionRow}>
                {sampleInformation && (
                  <section className={styles.approvalItems}>
                    {sampleInformation}
                  </section>
                )}
                {!multiSamples && (
                  <>
                    <div>
                      <div>{sample.sampleTypeName}</div>
                      <h6>
                        {sample.referralFromFacilityName
                          ? `${
                              sample.referralInExternalRef
                                ? sample.referralInExternalRef + "-"
                                : ""
                            }${sample.referralFromFacilityName}`
                          : `${sample.patientIdentifier}-${
                              sample.patientFamilyName ?? ""
                            }
          ${sample.patientGivenName ?? ""}
          ${sample.patientMiddleName ?? ""}`}
                      </h6>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        columnGap: "0.5rem",
                      }}
                    >
                      <Tag type="green">
                        <SampleReferenceDisplay
                          showPrint={true}
                          reference={sample.accessionNumber}
                          className={styles.testSampleReference}
                          sampleUuid={sample.uuid}
                          sampleType={sample.sampleTypeName}
                          entityName={getSampleEntityName(sample)}
                        />
                      </Tag>
                      {sample.providedRef && (
                        <Tag type="teal">
                          <SampleReferenceDisplay
                            showPrint={true}
                            reference={sample.providedRef}
                            className={styles.testSampleReference}
                            sampleUuid={sample.uuid}
                            sampleType={sample.sampleTypeName}
                            entityName={getSampleEntityName(sample)}
                          />
                        </Tag>
                      )}
                      {sample.externalRef && (
                        <Tag type="gray">
                          <SampleReferenceDisplay
                            showPrint={true}
                            reference={sample.externalRef}
                            className={styles.testSampleReference}
                            sampleUuid={sample.uuid}
                            sampleType={sample.sampleTypeName}
                            entityName={getSampleEntityName(sample)}
                          />
                        </Tag>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className={styles.sectionRow}>
                <Controller
                  control={control}
                  name="actionDate"
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
                        invalid={!!errors.actionDate}
                        invalidText={
                          errors.actionDate && errors?.actionDate?.message
                        }
                        id="actionDate"
                        name="actionDate"
                        placeholder={DATE_PICKER_FORMAT}
                        labelText={t("date", "Date")}
                        value={formatForDatePicker(value)}
                        defaultValue={value}
                      />
                    </DatePicker>
                  )}
                />
              </div>
              {!multiSamples && (
                <>
                  {(storageUnitRequired || readonlyStorage) && (
                    <div className={styles.sectionRow}>
                      {readonlyStorage && (
                        <TextInput
                          value={
                            sample.storageUnitName
                              ? `${sample.storageName}/${sample.storageUnitName}`
                              : ""
                          }
                          readOnly={true}
                          labelText={t(
                            "laboratoryRepositoryStorage",
                            "Storage"
                          )}
                        />
                      )}
                      {storageUnitRequired && !readonlyStorage && (
                        <>
                          <ControlledStorageSelector
                            controllerName={`storageUuid`}
                            active={true}
                            name={`storageUuid`}
                            control={control}
                            title={t("laboratoryRepositoryStorage", "Storage")}
                            placeholder={t("filter", "Filter ...")}
                            invalid={!!errors?.storageUuid}
                            onChange={() => {
                              setValue("storageUnitUuid", null);
                            }}
                            invalidText={errors?.storageUuid?.message}
                            className={
                              storageUuid ? styles.storageSelected : ""
                            }
                          />
                          {storageUuid && (
                            <ControlledStorageUnitSelector
                              controllerName={`storageUnitUuid`}
                              storageUuid={storageUuid}
                              active={true}
                              assigned={false}
                              name={`storageUnitUuid`}
                              control={control}
                              title={t(
                                "laboratoryRepositoryStorageUnit",
                                "Storage Unit"
                              )}
                              placeholder={t("filter", "Filter ...")}
                              invalid={!!errors?.storageUnitUuid}
                              invalidText={errors?.storageUnitUuid?.message}
                            />
                          )}
                        </>
                      )}
                    </div>
                  )}

                  <div className={styles.sectionField}>
                    <div className={styles.sectionRow}>
                      <ControlledNumberInput
                        id={`id-thawCycles`}
                        name="thawCycles"
                        control={control}
                        controllerName="thawCycles"
                        maxLength={10}
                        size={"md"}
                        defaultValue={defaultThawCycles}
                        hideSteppers={true}
                        hideLabel={false}
                        allowEmpty={true}
                        labelText={t("laboratoryThawCycles", "Thaw Cycles")}
                        pattern="[0-9]"
                        step="1"
                        invalid={!!errors.thawCycles}
                        placeholder={"e.g. 3"}
                        invalidText={
                          errors.thawCycles && errors?.thawCycles?.message
                        }
                      />
                    </div>
                  </div>
                  <div className={styles.sectionField}>
                    <div className={styles.sectionRow}>
                      <ControlledNumberInput
                        id={`id-volume-2`}
                        type=""
                        name="volume"
                        control={control}
                        controllerName="volume"
                        maxLength={10}
                        size={"md"}
                        defaultValue={sample?.volume ?? null}
                        hideSteppers={true}
                        hideLabel={false}
                        allowEmpty={true}
                        labelText={t("laboratoryVolume", "Volume")}
                        placeholder="e.g. 30"
                        invalid={!!errors.volume}
                        invalidText={errors.volume && errors?.volume?.message}
                      />

                      <ConceptMembersSelector
                        popUpDrirection="bottom"
                        conceptUuid={laboratoryVolumeMeasurementTypeConcept}
                        selectedId={sample?.volumeUnitUuid}
                        selectedText={sample?.volumeUnitName}
                        controllerName={`volumeUnitUuid`}
                        name={`volumeUnitUuid`}
                        control={control}
                        title={t("laboratoryVolumeUnit", "Volume Unit")}
                        onChange={(e) => {}}
                        placeholder={t("laboratoryVolumeUnitLabel", "Unit")}
                        invalid={!!errors?.volumeUnitUuid}
                        invalidText={errors?.volumeUnitUuid?.message}
                      />
                    </div>
                  </div>
                </>
              )}
              <div className={styles.sectionRow}>
                <UsersSelector
                  selectedId={session?.user?.uuid}
                  selectedText={
                    session?.user?.person?.display ??
                    session?.user?.display ??
                    ""
                  }
                  controllerName={`responsiblePersonUuid`}
                  name={`responsiblePersonUuid`}
                  control={control}
                  title={t("laboratoryResponsiblePerson", "Responsible Person")}
                  placeholder={t("filter", "Filter ...")}
                  invalid={!!errors?.responsiblePersonUuid}
                  invalidText={errors?.responsiblePersonUuid?.message}
                />

                {responsibilityPersonUuid &&
                  responsibilityPersonUuid === otherUser.uuid && (
                    <div style={{ paddingTop: "0.5rem" }}>
                      <ControlledTextInput
                        id={`id-responsiblePersonOther`}
                        name="responsiblePersonOther"
                        control={control}
                        controllerName="responsiblePersonOther"
                        maxLength={150}
                        placeholder={t("pleaseSpecify", "Please Specify")}
                        size={"sm"}
                        value={""}
                        labelText={t(
                          "laboratoryResponsiblePersonOtherName",
                          "Other Name"
                        )}
                        invalid={!!errors?.responsiblePersonOther}
                        invalidText={errors?.responsiblePersonOther?.message}
                      />
                    </div>
                  )}
              </div>
              <div className={styles.sectionRow}>
                <ControlledTextArea
                  id="approvalRequestRemarks"
                  name="remarks"
                  control={control}
                  controllerName="remarks"
                  maxLength={500}
                  labelText={remarksTextLabel}
                  invalid={!!errors.remarks}
                  invalidText={errors.remarks && errors?.remarks?.message}
                />
              </div>
            </section>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={(e) => closeModal(false)}>
            {t("cancel", "Cancel")}
          </Button>
          <Button
            kind={kind}
            onClick={handleSubmit(handleSave, handleInvalid)}
            disabled={isSaving}
          >
            {isSaving ? <InlineLoading /> : actionButtonLabel}
          </Button>
        </ModalFooter>
      </Form>
    </div>
  );
};

export default StorageActionDialog;
