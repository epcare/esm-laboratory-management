import React, { ReactNode, useEffect, useState } from "react";

import {
  Button,
  Form,
  ModalBody,
  ModalFooter,
  ModalHeader,
  InlineLoading,
} from "@carbon/react";
import { useTranslation } from "react-i18next";
import styles from "./approve-test-request-dialog.scss";
import { showNotification, showSnackbar } from "@openmrs/esm-framework";
import { extractErrorMessagesFromResponse } from "../../utils/functions";
import { useForm } from "react-hook-form";
import {
  ApproveTestFormData,
  ApproveTestSchema,
} from "./approve-test-request-validation-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import ControlledTextArea from "../../components/controlled-text-area/controlled-text-area.component";

interface ApproveTestRequestDialogProps {
  approvalTitle: ReactNode;
  approvalDescription: ReactNode;
  closeModal: (success: boolean) => void;
  remarksTextLabel: string;
  remarksRequired: boolean;
  hideRemarks?: boolean;
  actionButtonLabel: string;
  approveCallback: (remarks: string) => Promise<object>;
  kind?: string;
  successMessageTitle: string;
  successMessageBody: string;
}

const ApproveTestRequestDialog: React.FC<ApproveTestRequestDialogProps> = ({
  approvalTitle,
  approvalDescription,
  closeModal,
  remarksTextLabel,
  actionButtonLabel,
  remarksRequired,
  approveCallback,
  successMessageTitle,
  successMessageBody,
  kind,
  hideRemarks,
}) => {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);

  const { handleSubmit, control, formState, setFocus } =
    useForm<ApproveTestFormData>({
      defaultValues: {
        remarksRequired: remarksRequired ?? false,
        remarks: "",
      },
      mode: "all",
      resolver: zodResolver(ApproveTestSchema),
    });

  const { errors } = formState;

  const handleSave = async (record: ApproveTestFormData) => {
    try {
      setIsSaving(true);
      await approveCallback(record.remarks);
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

  useEffect(() => {
    setFocus("remarks");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <Form>
        <ModalHeader
          closeModal={(e) => closeModal(false)}
          title={approvalTitle}
        />
        <ModalBody>
          <div className={styles.modalBody}>
            <section className={styles.approvalItems}>
              {approvalDescription}
            </section>
            {!hideRemarks && (
              <section className={styles.section}>
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
              </section>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={(e) => closeModal(false)}>
            {t("cancel", "Cancel")}
          </Button>
          <Button
            kind={kind}
            onClick={handleSubmit(handleSave)}
            disabled={isSaving}
          >
            {isSaving ? <InlineLoading /> : actionButtonLabel}
          </Button>
        </ModalFooter>
      </Form>
    </div>
  );
};

export default ApproveTestRequestDialog;
