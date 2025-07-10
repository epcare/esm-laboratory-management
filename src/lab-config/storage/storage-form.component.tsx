import React, { useEffect, useState } from "react";
import styles from "./storage-form.component.scss";
import {
  Button,
  InlineLoading,
  ModalBody,
  ModalFooter,
  FormGroup,
  TextInput,
  Select,
  SelectItem,
  TextArea,
} from "@carbon/react";
import { useTranslation } from "react-i18next";
import { closeOverlay } from "../../components/overlay/hook";
import {
  FetchResponse,
  showNotification,
  showSnackbar,
  useLocations,
  useSession,
  userHasAccess,
} from "@openmrs/esm-framework";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Storage } from "../../api/types/storage";
import { StorageFormData, storageSchema } from "./storage-validation-schema";
import ControlledTextInput from "../../components/controlled-text-input/controlled-text-input.component";
import ControlledRadioButtonGroup from "../../components/controlled-radio-button-group/controlled-radio-button-group.component";
import { TASK_LABMANAGEMENT_STORAGE_MUTATE } from "../../config/privileges";
import { createStorage, updateStorage } from "../../api/storage.resource";
import { URL_API_STORAGE } from "../../config/urls";
import { handleMutate } from "../../api/swr-revalidation";
import { useLaboratoryConfig } from "../../hooks/useLaboratoryConfig";
import ControlledTextArea from "../../components/controlled-text-area/controlled-text-area.component";
import { requireApprovalOptions } from "../../api/types/test-config";
import ControlledNumberInput from "../../components/controlled-text-input/controlled-number-input.component";

interface StorageFormProps {
  model?: Storage;
}

const StorageForm: React.FC<StorageFormProps> = ({ model }) => {
  const { t } = useTranslation();
  const userSession = useSession();
  const [isNew] = useState(!Boolean(model?.uuid));
  const [canEdit, setCanEdit] = useState(isNew);
  const {
    laboratoryConfig: { laboratoryLocationTag },
  } = useLaboratoryConfig();
  const diagnosticCenters = useLocations(laboratoryLocationTag);

  useEffect(
    () => {
      setCanEdit(
        userSession?.user &&
          userHasAccess(TASK_LABMANAGEMENT_STORAGE_MUTATE, userSession.user)
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const { handleSubmit, control, formState, watch } = useForm<StorageFormData>({
    defaultValues: {
      ...(model ?? {}),
      ...{
        active: model?.active ?? false,
      },
    },
    mode: "all",
    resolver: zodResolver(storageSchema),
  });

  const { errors } = formState;

  const handleSave = async (item: Storage) => {
    try {
      setIsSaving(true);
      const response: FetchResponse<Storage> = await (isNew
        ? createStorage
        : updateStorage)(item);

      handleMutate(URL_API_STORAGE);

      if (response?.data) {
        showSnackbar({
          isLowContrast: true,
          title: isNew
            ? t("laboratoryAddStorage", "Add Storage")
            : t("laboratoryEditStorage", "Edit Storage"),
          kind: "success",
          subtitle: isNew
            ? t("laboratoryAddStorageSuccess", "Storage Added Successfully")
            : t("laboratoryEditStorageSuccess", "Storage Edited Successfully"),
          autoClose: true,
        });

        closeOverlay();
      }
    } catch (error) {
      setIsSaving(false);
      showNotification({
        title: isNew
          ? t("laboratoryAddStorageurationError", "Error adding a storage")
          : t("laboratoryEditStorageurationError", "Error editing a storage"),
        kind: "error",
        critical: true,
        description: error?.responseBody?.error?.message,
      });
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  return (
    <form>
      <ModalBody className={styles.modalBody}>
        {/* <div className={styles.errorText}>
          {Object.entries(errors).map(([key, error]) => (
            <div>
              {key}:{error.message}
            </div>
          ))}
        </div> */}
        <section className={styles.section}>
          <Controller
            control={control}
            name="atLocationUuid"
            render={({ field: { onChange, ref, value } }) => (
              <Select
                ref={ref}
                name="atLocationUuid"
                value={value}
                className="select-field"
                labelText={t("laboratoryDiagnosticCenter", "Lab Section")}
                onChange={(e) => {
                  onChange(e.target.value);
                }}
                defaultValue=""
                invalid={errors?.atLocationUuid?.message}
                invalidText={errors?.atLocationUuid?.message}
              >
                <SelectItem
                  value=""
                  text={t("laboratorySelectLabSection", "Specify Lab Section")}
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

          {!canEdit && (
            <TextInput
              value={model.atLocationName}
              readOnly={true}
              labelText={t("laboratoryDiagnosticCenter", "Lab Section")}
            />
          )}

          {canEdit && (
            <ControlledTextInput
              id={`id-name`}
              readOnly={!canEdit}
              name="name"
              control={control}
              controllerName="name"
              maxLength={255}
              size={"md"}
              value={`${model?.name ?? ""}`}
              labelText={t("laboratoryStorageName", "Name")}
              helperText={t(
                "laboratoryStorageNameHelpText",
                "Storage name e.g. Fridge1/CrateA"
              )}
              invalid={!!errors.name}
              invalidText={errors.name && errors?.name?.message}
            />
          )}

          {!canEdit && (
            <TextInput
              value={model.name}
              readOnly={true}
              labelText={t("laboratoryStorageName", "Name")}
            />
          )}

          <ControlledTextArea
            name="description"
            rows={2}
            control={control}
            controllerName="description"
            maxLength={500}
            value={`${model?.description ?? ""}`}
            labelText={t("description", "Description")}
            invalid={!!errors.description}
            invalidText={errors.description && errors?.description?.message}
          />
          {!canEdit && (
            <TextArea
              value={model.description}
              readOnly={true}
              labelText={t("description", "Description")}
            />
          )}

          {canEdit && (
            <ControlledNumberInput
              id={`id-capacity`}
              name="capacity"
              control={control}
              controllerName="capacity"
              maxLength={10}
              size={"md"}
              defaultValue={model?.capacity}
              hideSteppers={true}
              hideLabel={false}
              allowEmpty={false}
              labelText={t("laboratoryStorageCapacity", "Capacity")}
              pattern="[0-9]"
              step="1"
              invalid={!!errors.capacity}
              invalidText={errors.capacity && errors?.capacity?.message}
            />
          )}

          {!canEdit && (
            <TextInput
              value={model.capacity}
              readOnly={true}
              labelText={t("laboratoryStorageCapacity", "Capacity")}
            />
          )}

          {canEdit && (
            <>
              <FormGroup
                className="clear-margin-bottom"
                legendText={t("laboratoryStorageActive", "Active?")}
                title={t("laboratoryTestActive", "Active?")}
              >
                <ControlledRadioButtonGroup
                  control={control}
                  name="active"
                  defaultSelected={model.active}
                  controllerName="active"
                  legendText=""
                  invalid={!!errors.active}
                  onChange={(e) => {}}
                  invalidText={errors.active && errors?.active?.message}
                  options={requireApprovalOptions}
                />
              </FormGroup>
              {errors.active && errors?.active?.message && (
                <div className={styles.errorText}>
                  {t(errors?.active?.message)}
                </div>
              )}
            </>
          )}

          {!canEdit && (
            <TextInput
              value={model.active ? t("yes", "Yes") : t("no", "No")}
              readOnly={true}
              labelText={t("laboratoryStorageActive", "Active?")}
            />
          )}
        </section>
      </ModalBody>
      <ModalFooter>
        <Button
          disabled={isSaving}
          onClick={() => closeOverlay()}
          kind="secondary"
        >
          {t("cancel", "Cancel")}
        </Button>
        <Button onClick={handleSubmit(handleSave)}>
          {isSaving ? <InlineLoading /> : t("save", "Save")}
        </Button>
      </ModalFooter>
    </form>
  );
};

export default StorageForm;
