import React, { useState } from "react";
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
} from "@openmrs/esm-framework";
import { Controller, useForm } from "react-hook-form";
import {
  Sample,
  SampleStatusCollection,
  SampleStatusDisposed,
  SampleStatuses,
} from "../../api/types/sample";
import {
  TestRequest,
  TestRequestAction,
  TestResultActionTypeUseExistingSample,
} from "../../api/types/test-request";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  TestRequestItemStatusCancelled,
  TestRequestItemStatusReferredOutProvider,
  TestRequestItemStatusSampleCollection,
} from "../../api/types/test-request-item";
import styles from "./register-sample-dialog.scss";
import { formatTestName } from "../../components/test-name";
import { handleMutate } from "../../api/swr-revalidation";
import { URL_API_SAMPLE, URL_API_TEST_REQUEST } from "../../config/urls";
import { extractErrorMessagesFromResponse } from "../../utils/functions";
import { SampleReferenceDisplay } from "../../components/sample-reference-display";
import { getEntityName } from "../../components/test-request/entity-name";
import ControlledSampleSelector from "../../components/samples/controlled-sample-selector.component";
import {
  ExistingSampleFormData,
  ExistingSampleSchema,
} from "./use-existing-sample-validation-schema";
import { applyTestRequestAction } from "../../api/test-request.resource";
import { ApprovalActionApproved } from "../../api/types/approval-action";

interface RegisterSampleDialogProps {
  testRequest: TestRequest;
  closeModal: () => void;
}

const RegisterSampleDialog: React.FC<RegisterSampleDialogProps> = ({
  testRequest,
  closeModal,
}) => {
  const { t } = useTranslation();
  const [sample, setSample] = useState<Sample>();
  const [isSaving, setIsSaving] = useState(false);
  const [sampleStatuses] = useState(() => {
    return SampleStatuses.filter((p) => p != SampleStatusDisposed).join(",");
  });

  const { handleSubmit, control, formState, setFocus, watch, setValue } =
    useForm<ExistingSampleFormData>({
      defaultValues: {
        sampleUuid: null,
        tests: [],
      },
      mode: "all",
      resolver: zodResolver(ExistingSampleSchema),
    });

  const { errors } = formState;

  //const selectedTests = watch("tests", (sample?.tests as Array<TestRequestItem>)?.map((p) => p.uuid) ?? []);

  const handleSave = async (item: ExistingSampleFormData) => {
    try {
      // pick lab test
      let body: TestRequestAction = {
        action: ApprovalActionApproved,
        actionType: TestResultActionTypeUseExistingSample,
        uuid: item.sampleUuid,
        testRequestUuid: testRequest.uuid,
        records: item.tests,
      };

      setIsSaving(true);
      const response: FetchResponse<Sample> = await applyTestRequestAction(
        body
      );

      handleMutate(URL_API_TEST_REQUEST);
      handleMutate(URL_API_SAMPLE);

      if (response?.data) {
        showSnackbar({
          isLowContrast: true,
          title: t("laboratoryAddExistingSample", "Add Existing Sample"),
          kind: "success",
          subtitle: t(
            "laboratorySavedExistingSampleSuccess",
            "Added existing sample successfully"
          ),
        });
        closeModal();
      }
    } catch (error) {
      setIsSaving(false);
      showNotification({
        title: t(
          "laboratoryAddExistingSampleError",
          "Error adding existing sample"
        ),
        kind: "error",
        critical: true,
        description: error?.message,
      });
    }
  };

  const sampleUuid = watch("sampleUuid", null);

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
        <ModalBody className={styles.minModalBody}>
          <div className={styles.modalBody}>
            <div className={styles.sectionRow}>
              <div className={styles.sectionTitle}>
                {t("laboratorySpecifySample", "Sample")}
              </div>
              <div className={styles.sectionField}>
                <ControlledSampleSelector
                  direction="bottom"
                  sampleStatus={sampleStatuses}
                  patientUuid={
                    testRequest?.referralFromFacilityName
                      ? null
                      : testRequest?.patientUuid
                  }
                  referralLocationUuid={
                    testRequest?.referralFromFacilityName
                      ? testRequest.referralFromFacilityUuid
                      : null
                  }
                  controllerName={`sampleUuid`}
                  name={`sampleUuid`}
                  control={control}
                  title=""
                  onChange={setSample}
                  placeholder={t("laboratorySpecifySample", "Sample")}
                  invalid={!!errors?.sampleUuid}
                  invalidText={errors?.sampleUuid?.message}
                />
              </div>
            </div>
            {sample && (
              <>
                <div className={styles.sectionRow}>
                  <div className={styles.sectionTitle}></div>
                  <div className={styles.sectionField}>
                    <div
                      className={styles.sampleInfo}
                      style={{ paddingTop: "0.5rem" }}
                    >
                      {sample.sampleTypeName && (
                        <div>
                          {t("laboratorySpecifySampleType", "Sample Type")}
                          <p>{sample.sampleTypeName}</p>
                        </div>
                      )}
                      {sample.providedRef && (
                        <div>
                          {t(
                            "laboratoryAdditionalReference",
                            "Additional Reference"
                          )}
                          <p>{sample.providedRef}</p>
                        </div>
                      )}
                      {sample.externalRef && (
                        <div>
                          {t(
                            "laboratoryExternalRef",
                            "Sample Reference Number"
                          )}
                          <p>{sample.externalRef}</p>
                        </div>
                      )}
                      {sample.storageStatus ? (
                        <div>
                          {t("laboratorySampleStorageStatus", "Status")}
                          <p>{t(sample.storageStatus)}</p>
                        </div>
                      ) : sample.status ? (
                        <div>
                          {t("laboratorySampleStatus", "Status")}
                          <p>{t(sample.status)}</p>
                        </div>
                      ) : (
                        <></>
                      )}
                    </div>
                  </div>
                </div>
              </>
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
                                p?.samples?.length == 0) &&
                              p.status !=
                                TestRequestItemStatusReferredOutProvider &&
                              p.status != TestRequestItemStatusCancelled
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
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={closeModal}>
            {t("cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleSubmit(handleSave)}
            disabled={!sampleUuid || isSaving}
          >
            {isSaving ? <InlineLoading /> : t("save", "Save")}
          </Button>
        </ModalFooter>
      </Form>
    </div>
  );
};

export default RegisterSampleDialog;
