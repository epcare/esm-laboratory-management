import React, { useEffect, useState } from "react";
import {
  Button,
  Form,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Checkbox,
  InlineLoading,
  Tag,
} from "@carbon/react";
import { useTranslation } from "react-i18next";
import {
  FetchResponse,
  showNotification,
  showSnackbar,
  userHasAccess,
  useSession,
} from "@openmrs/esm-framework";
import {
  SampleFormData,
  SampleSchema,
} from "./register-sample-validation-schema";
import { Controller, useForm } from "react-hook-form";
import {
  Sample,
  SampleStatusCollection,
  StorageStatusCheckedOut,
} from "../../api/types/sample";
import { TestRequest } from "../../api/types/test-request";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  TestRequestItem,
  TestRequestItemStatusCancelled,
  TestRequestItemStatusReferredOutProvider,
  TestRequestItemStatusRequestApproval,
  TestRequestItemStatusSampleCollection,
} from "../../api/types/test-request-item";
import styles from "./register-sample-dialog.scss";
import ConceptMembersSelector from "../../components/concepts-selector/concept-members-selector.component";
import ControlledAccessionNumber from "../../components/controlled-accession-number/controlled-accession-number.component";
import ControlledTextInput from "../../components/controlled-text-input/controlled-text-input.component";
import ReferrerLocationSelector from "../../components/referral-locations-selector/referral-locations-selector.component";
import { formatTestName } from "../../components/test-name";
import ControlledNumberInput from "../../components/controlled-text-input/controlled-number-input.component";
import { createSample, updateSample } from "../../api/sample.resource";
import { handleMutate } from "../../api/swr-revalidation";
import { URL_API_SAMPLE, URL_API_TEST_REQUEST } from "../../config/urls";
import { extractErrorMessagesFromResponse } from "../../utils/functions";
import { SampleReferenceDisplay } from "../../components/sample-reference-display";
import { useLaboratoryConfig } from "../../hooks/useLaboratoryConfig";
import { getEntityName } from "../../components/test-request/entity-name";
import { TASK_LABMANAGEMENT_REPOSITORY_MUTATE } from "../../config/privileges";
import ControlledStorageSelector from "../../components/storage/controlled-storage-selector.component";
import ControlledStorageUnitSelector from "../../components/storage/controlled-storage-unit-selector.component";

interface RegisterSampleDialogProps {
  testRequest: TestRequest;
  sample?: Sample;
  closeModal: () => void;
}

const RegisterSampleDialog: React.FC<RegisterSampleDialogProps> = ({
  testRequest,
  sample,
  closeModal,
}) => {
  const { t } = useTranslation();
  const session = useSession();
  const [canArchiveSamples, setCanArchiveSamples] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const {
    laboratoryConfig: {
      laboratorySpecimenTypeConcept,
      laboratoryContainerTypeConcept,
      laboratoryVolumeMeasurementTypeConcept,
    },
  } = useLaboratoryConfig();

  useEffect(() => {
    setCanArchiveSamples(
      session?.user &&
        userHasAccess(TASK_LABMANAGEMENT_REPOSITORY_MUTATE, session.user)
    );
  }, [session.user]);

  const { handleSubmit, control, formState, setFocus, watch, setValue } =
    useForm<SampleFormData>({
      defaultValues: {
        uuid: sample?.uuid,
        sampleTypeUuid: sample?.sampleTypeUuid,
        providedRef: sample?.providedRef,
        confirmProvidedRef: sample?.providedRef,
        accessionNumber: sample?.accessionNumber,
        tests:
          (sample?.tests as Array<TestRequestItem>)?.map((p) => p.uuid) ?? [],
        containerTypeUuid: sample?.containerTypeUuid,
        containerCount: sample?.containerCount ?? null,
        specifyVolume: Boolean(sample?.volume),
        volume: sample?.volume ?? null,
        volumeUnitUuid: sample?.volumeUnitUuid,
        referredOut: sample?.referredOut ?? false,
        referralToFacilityUuid: sample?.referralToFacilityUuid,
        archiveSample: false,
      },
      mode: "all",
      resolver: zodResolver(SampleSchema),
    });

  const { errors } = formState;
  const referredOut = watch("referredOut", sample?.referredOut ?? false);
  const archiveSample = watch("archiveSample", false);
  const storageUuid = watch("storageUuid", null);
  //const selectedTests = watch("tests", (sample?.tests as Array<TestRequestItem>)?.map((p) => p.uuid) ?? []);

  const handleSave = async (item: SampleFormData) => {
    try {
      // pick lab test
      let body = {
        sampleTypeUuid: item.sampleTypeUuid,
        accessionNumber: item.accessionNumber,
        providedRef: item.referredOut ? item.providedRef : undefined,
        tests: item.tests,
        containerTypeUuid: item.containerTypeUuid,
        containerCount:
          item.containerCount != 0 ? item.containerCount : undefined,
        volume: item.volume != 0 ? item.volume : undefined,
        volumeUnitUuid: item.volumeUnitUuid,
        referredOut: item.referredOut,
        referralToFacilityUuid: item.referredOut
          ? item.referralToFacilityUuid
          : undefined,
      };
      if (item.archiveSample) {
        body["archive"] = true;
        body["storageUnitUuid"] = item.storageUnitUuid;
      }
      if (!item.uuid) {
        body = {
          ...body,
          ...{
            atLocationUuid: session.sessionLocation?.uuid,
            testRequestUuid: testRequest.uuid,
          },
        };
      }

      setIsSaving(true);
      const response: FetchResponse<Sample> = await (item.uuid
        ? updateSample(item.uuid, body)
        : createSample(body));

      handleMutate(URL_API_TEST_REQUEST);
      handleMutate(URL_API_SAMPLE);

      if (response?.data) {
        showSnackbar({
          isLowContrast: true,
          title: t("laboratoryAddSample", "Add Sample"),
          kind: "success",
          subtitle: t(
            "laboratorySavedSampleSuccess",
            "Sample saved Successfully"
          ),
        });
        closeModal();
      }
    } catch (error) {
      setIsSaving(false);
      showNotification({
        title: t("laboratoryAddSampleError", "Error adding sample"),
        kind: "error",
        critical: true,
        description: error?.message,
      });
    }
  };

  return (
    <div>
      <Form onSubmit={handleSubmit(handleSave)}>
        <ModalHeader
          closeModal={closeModal}
          title={t(
            "labaoratorySampleTestRequestNo",
            `Test Request: ${testRequest?.requestNo}`
          )}
        />
        <ModalBody>
          {/* <div className={styles.errorText}>
            {Object.entries(errors).map(([key, error]) => (
              <div>
                {key}:{error.message}
              </div>
            ))}
          </div> */}
          <div className={styles.modalBody}>
            <div className={styles.sectionRow}>
              <div className={styles.sectionTitle}>
                {t("laboratorySpecifySampleType", "Sample Type")}
              </div>
              <div className={styles.sectionField}>
                <ConceptMembersSelector
                  popUpDrirection="bottom"
                  conceptUuid={laboratorySpecimenTypeConcept}
                  selectedId={sample?.sampleTypeUuid}
                  selectedText={sample?.sampleTypeName}
                  controllerName={`sampleTypeUuid`}
                  name={`sampleTypeUuid`}
                  control={control}
                  title=""
                  onChange={(e) => {}}
                  placeholder={t("laboratorySpecifySampleType", "Sample Type")}
                  invalid={!!errors?.sampleTypeUuid}
                  invalidText={errors?.sampleTypeUuid?.message}
                />
              </div>
            </div>
            <div className={styles.sectionRow}>
              <div className={styles.sectionTitle}>
                {t("laboratorySampleReference", "Sample ID")}
              </div>
              <div className={styles.sectionField}>
                <ControlledAccessionNumber
                  id={`id-accessionNumber`}
                  readOnly={false}
                  name={`accessionNumber`}
                  control={control}
                  controllerName={`accessionNumber`}
                  maxLength={100}
                  size={"sm"}
                  value={sample?.accessionNumber ?? ""}
                  labelText=""
                  placeholder={t(
                    "laboratoryGenerateReference",
                    "Generate Reference"
                  )}
                  invalid={!!errors?.accessionNumber}
                  invalidText={
                    errors?.accessionNumber && errors?.accessionNumber?.message
                  }
                  onChange={(e) => {}}
                />
              </div>
            </div>
            <div className={styles.sectionRow}>
              <div className={styles.sectionTitle}>
                {t("laboratoryContainer", "Container")}
              </div>
              <div className={styles.sectionField}>
                <div className={styles.sectionRow}>
                  <div className={styles.numericInput}>
                    <ControlledNumberInput
                      id={`id-containerCount`}
                      name="containerCount"
                      control={control}
                      controllerName="containerCount"
                      maxLength={10}
                      size={"md"}
                      defaultValue={sample?.containerCount}
                      hideSteppers={true}
                      hideLabel={true}
                      allowEmpty={true}
                      labelText=""
                      pattern="[0-9]"
                      step="1"
                      invalid={!!errors.containerCount}
                      invalidText={
                        errors.containerCount && errors?.containerCount?.message
                      }
                    />
                  </div>
                  <div className={styles.sectionField}>
                    <ConceptMembersSelector
                      popUpDrirection="bottom"
                      conceptUuid={laboratoryContainerTypeConcept}
                      selectedId={sample?.containerTypeUuid}
                      selectedText={sample?.containerTypeName}
                      controllerName={`containerTypeUuid`}
                      name={`containerTypeUuid`}
                      control={control}
                      title=""
                      onChange={(e) => {}}
                      placeholder={t(
                        "laboratoryContainerType",
                        "Container Type"
                      )}
                      invalid={!!errors?.containerTypeUuid}
                      invalidText={errors?.containerTypeUuid?.message}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.sectionRow}>
              <div className={styles.sectionTitle}>
                {t("laboratoryVolume", "Volume")}
              </div>
              <div className={styles.sectionField}>
                <div className={styles.sectionRow}>
                  <div className={styles.numericInput}>
                    <ControlledNumberInput
                      id={`id-volume`}
                      type=""
                      name="volume"
                      control={control}
                      controllerName="volume"
                      maxLength={10}
                      size={"md"}
                      defaultValue={sample?.volume}
                      hideSteppers={true}
                      hideLabel={true}
                      allowEmpty={true}
                      labelText=""
                      invalid={!!errors.volume}
                      invalidText={errors.volume && errors?.volume?.message}
                    />
                  </div>
                  <div className={styles.sectionField}>
                    <ConceptMembersSelector
                      popUpDrirection="bottom"
                      conceptUuid={laboratoryVolumeMeasurementTypeConcept}
                      selectedId={sample?.volumeUnitUuid}
                      selectedText={sample?.volumeUnitName}
                      controllerName={`volumeUnitUuid`}
                      name={`volumeUnitUuid`}
                      control={control}
                      title=""
                      onChange={(e) => {}}
                      placeholder={t("laboratoryVolumeUnit", "Volume Unit")}
                      invalid={!!errors?.volumeUnitUuid}
                      invalidText={errors?.volumeUnitUuid?.message}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.sectionRow}>
              <div className={styles.sectionTitle}>
                <Controller
                  name={"referredOut"}
                  control={control}
                  render={({ field: { onChange, value, ref } }) => (
                    <Checkbox
                      checked={value}
                      id={"referredOut"}
                      ref={ref}
                      onChange={(e) => onChange(Boolean(!value))}
                      labelText={t("laboratoryReferred", "Referred")}
                    />
                  )}
                />
              </div>
              <div className={styles.sectionField}>
                {referredOut && (
                  <ReferrerLocationSelector
                    selectedId={sample?.referralToFacilityUuid}
                    selectedText={sample?.referralToFacilityName}
                    controllerName={"referralToFacilityUuid"}
                    name="referralToFacilityUuid"
                    control={control}
                    placeholder={t(
                      "selectAreferelPoint",
                      "Select a referal point"
                    )}
                    invalid={!!errors.referralToFacilityUuid}
                    invalidText={
                      errors.referralToFacilityUuid &&
                      errors?.referralToFacilityUuid?.message
                    }
                    referrerOut={true}
                  />
                )}
              </div>
            </div>
            {referredOut && (
              <div className={styles.sectionField}>
                <div className={styles.sectionRow}>
                  <div className={styles.sectionTitle}>
                    {t("laboratoryAdditionalReference", "Additional Reference")}
                  </div>
                  <div className={styles.sectionField}>
                    <div className={styles.sectionRow}>
                      <ControlledTextInput
                        id="id-providedRef"
                        name="providedRef"
                        control={control}
                        controllerName="providedRef"
                        placeholder={t(
                          "laboratorySampleProviderReference",
                          "Reference"
                        )}
                        maxLength={10}
                        size={"md"}
                        value={`${sample?.providedRef ?? ""}`}
                        labelText=""
                        invalid={!!errors.providedRef}
                        invalidText={
                          errors.providedRef && errors?.providedRef?.message
                        }
                      />
                      <ControlledTextInput
                        id="id-confirmProvidedRef"
                        name="confirmProvidedRef"
                        control={control}
                        controllerName="confirmProvidedRef"
                        placeholder={t(
                          "laboratorySampleConfirmProviderReference",
                          "Confirm Reference"
                        )}
                        maxLength={10}
                        size={"md"}
                        value={`${sample?.providedRef ?? ""}`}
                        labelText=""
                        invalid={!!errors.confirmProvidedRef}
                        invalidText={
                          errors.confirmProvidedRef &&
                          errors?.confirmProvidedRef?.message
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className={styles.sectionRow}>
              <div className={styles.sectionTitle}>
                {t("laboratorySampleAssociatedTests", "Associated Tests")}
              </div>
              <div className={styles.sectionField}>
                <Controller
                  name={"tests"}
                  control={control}
                  render={({ field: { onChange, value, ref } }) => {
                    const onTestsChanged = (
                      cvt: React.ChangeEvent<HTMLInputElement>
                    ): void => {
                      let selectedTest = value?.find(
                        (x) => x === cvt.target.value
                      );
                      if (selectedTest) {
                        let newTests = [
                          ...(value?.filter((x) => x !== selectedTest) ?? []),
                        ];
                        onChange(newTests);
                      } else {
                        let newTests = [...(value ?? []), cvt.target.value];
                        onChange(newTests);
                      }
                    };
                    return (
                      <>
                        {testRequest?.tests
                          ?.filter(
                            (p) =>
                              (!p?.samples?.length ||
                                p?.samples?.length == 0 ||
                                (p?.samples?.some(
                                  (x) => x.uuid == sample?.uuid
                                ) &&
                                  p.status !==
                                    TestRequestItemStatusRequestApproval)) &&
                              p.status !=
                                TestRequestItemStatusReferredOutProvider &&
                              (p.status != TestRequestItemStatusCancelled ||
                                p.samples?.some((x) => x.uuid == sample?.uuid))
                          )
                          ?.map((test) => (
                            <div className={styles.test}>
                              <Checkbox
                                disabled={
                                  sample?.status !== SampleStatusCollection &&
                                  sample?.uuid &&
                                  test.status !=
                                    TestRequestItemStatusSampleCollection
                                }
                                ref={ref}
                                name={`tests-${test.uuid}`}
                                key={test.uuid}
                                id={test.uuid}
                                onChange={onTestsChanged}
                                value={test.uuid}
                                checked={Boolean(
                                  value && value.indexOf(test.uuid) >= 0
                                )}
                                labelText={formatTestName(
                                  test.testName,
                                  test.testShortName
                                )}
                              />
                              {test?.samples?.map((sample) => (
                                <Tag type="green">
                                  <SampleReferenceDisplay
                                    reference={sample.accessionNumber}
                                    className={styles.sampleRefNumber}
                                    sampleType={sample.sampleTypeName}
                                    entityName={getEntityName(testRequest)}
                                  ></SampleReferenceDisplay>
                                </Tag>
                              ))}
                            </div>
                          ))}
                        {errors.tests && errors?.tests?.message && (
                          <div className={styles.errorText}>
                            {t(errors?.tests?.message)}
                          </div>
                        )}
                      </>
                    );
                  }}
                />
              </div>
            </div>
            {canArchiveSamples &&
              (sample?.storageStatus == null ||
                sample?.storageStatus == StorageStatusCheckedOut) && (
                <div className={styles.sectionRow}>
                  <div className={styles.sectionTitle}>
                    <Controller
                      name={"archiveSample"}
                      control={control}
                      render={({ field: { onChange, value, ref } }) => (
                        <Checkbox
                          checked={value}
                          id={`registerSampleArchiveSample`}
                          ref={ref}
                          onChange={() => {
                            onChange(Boolean(!value));
                            setValue(`storageUuid`, null);
                            setValue(`storageUnitUuid`, null);
                          }}
                          labelText={t(
                            "laboratoryArchiveSample",
                            "Archive Sample"
                          )}
                        />
                      )}
                    />
                  </div>
                  <div
                    className={styles.sectionRow}
                    style={{ justifyContent: "flex-start", flexGrow: "1" }}
                  >
                    {archiveSample && (
                      <>
                        <ControlledStorageSelector
                          controllerName={`storageUuid`}
                          active={true}
                          name={`storageUuid`}
                          control={control}
                          title={t("laboratoryRepositoryStorage", "Storage")}
                          placeholder={t("filter", "Filter ...")}
                          onChange={() => {
                            setValue(`storageUnitUuid`, null);
                          }}
                          invalid={!!errors?.storageUuid}
                          invalidText={errors?.storageUuid?.message}
                          className={storageUuid ? styles.storageSelected : ""}
                          direction="top"
                        />
                        {storageUuid && (
                          <ControlledStorageUnitSelector
                            key={storageUuid}
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
                            direction="top"
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={closeModal}>
            {t("cancel", "Cancel")}
          </Button>
          <Button onClick={handleSubmit(handleSave)} disabled={isSaving}>
            {isSaving ? <InlineLoading /> : t("save", "Save")}
          </Button>
        </ModalFooter>
      </Form>
    </div>
  );
};

export default RegisterSampleDialog;
