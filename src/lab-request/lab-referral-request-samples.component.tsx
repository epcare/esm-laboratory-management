import React from "react";
import { TrashCan } from "@carbon/react/icons";
import {
  Button,
  TextInputSkeleton,
  DataTableSkeleton,
  Tile,
} from "@carbon/react";
import { DiagonisticCenterTests, Sample } from "../api/types/sample";
import { useLocations } from "@openmrs/esm-framework";
import { useTestConfigs } from "../api/test-config.resource";
import { useConcept } from "../api/concept.resource";
import ConceptMembersSelector from "../components/concepts-selector/concept-members-selector.component";
import { Control, useFieldArray } from "react-hook-form";
import { LabRequest } from "../api/types/lab-request";
import ControlledTextInput from "../components/controlled-text-input/controlled-text-input.component";
import ControlledAccessionNumber from "../components/controlled-accession-number/controlled-accession-number.component";
import LocationTests from "../components/tests-selector/location-tests.component";
import TestsSelector from "../components/tests-selector/tests-selector.component";
import { getUniqueId } from "../utils/string-utils";
import { Concept } from "../api/types/concept/concept";
import { useTranslation } from "react-i18next";
import styles from "./lab-referral-request-samples.component.scss";
import { useLaboratoryConfig } from "../hooks/useLaboratoryConfig";
import ControlledStorageSelector from "../components/storage/controlled-storage-selector.component";
import ControlledStorageUnitSelector from "../components/storage/controlled-storage-unit-selector.component";
import ControlledCheckBox from "../components/controlled-checkbox/controlled-checkbox.component";

interface SampleItemTableProps {
  items: Sample[];
  canEdit: boolean;
  errors: any;
  control: Control<LabRequest, LabRequest>;
  setValue: (name: string, value: any) => void;
  getValue: (name: string) => any;
  setFocus: (fieldName: string) => void;
  watch: (fieldName: string) => any;
  canArchiveSamples: boolean;
}

const SampleItemsTable: React.FC<SampleItemTableProps> = ({
  items,
  canEdit,
  errors,
  control,
  setValue,
  setFocus,
  canArchiveSamples,
  getValue,
  watch,
}) => {
  const { t } = useTranslation();

  const {
    laboratoryConfig: { laboratorySpecimenTypeConcept, laboratoryLocationTag },
  } = useLaboratoryConfig();
  const {
    items: { results: testOptions },
    isLoading: isLoadingTestOptions,
  } = useTestConfigs({ active: true });
  const { items: sampleTypeConcept, isLoading: isLoadingSampleTypeConcept } =
    useConcept(laboratorySpecimenTypeConcept);

  const locations = useLocations(laboratoryLocationTag);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "samples",
  });

  const onChangeRowColumnValue = (rowIndex: number) => {
    if (fields[rowIndex].uuid == fields[fields.length - 1].uuid) {
      let itemId = `new-item-${getUniqueId()}`;
      append({
        uuid: itemId,
        tests: {},
        archiveSample: false,
      } as any as Sample);
    }
  };

  const fixFocus = (fieldName: string) => {
    setTimeout(() => setFocus(fieldName), 100);
  };

  const onExternalRefChange = (
    row: Sample,
    rowIndex: number,
    value: string
  ) => {
    if (value) {
      onChangeRowColumnValue(rowIndex);
    }
    fixFocus(`samples.${rowIndex}.externalRef`);
  };

  const onTestsChanged = (value: any, rowIndex: number) => {
    //fixFocus(`samples.${rowIndex}.tests`);
  };

  const onAccessionNumberChange = (
    row: Sample,
    rowIndex: number,
    value: string
  ) => {
    if (value) {
      onChangeRowColumnValue(rowIndex);
    }
    fixFocus(`samples.${rowIndex}.accessionNumber`);
  };

  const onSampleTypeChange = (
    row: Sample,
    rowIndex: number,
    concept: Concept
  ) => {
    if (concept) {
      onChangeRowColumnValue(rowIndex);
    }
    fixFocus(`samples.${rowIndex}.externalRef`);
  };

  const onRemoveItem = (
    item: Sample,
    rowIndex: number,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    if (item.uuid?.startsWith("new-item")) {
      let itemId = item.uuid;
      if (itemId === items[items.length - 1].uuid) {
        return;
      }
    }
    remove(rowIndex);
  };

  if (isLoadingSampleTypeConcept || isLoadingTestOptions) {
    return <DataTableSkeleton role="progressbar" />;
  }

  return (
    <>
      {errors?.samples?.root && (
        <div className={styles.errorText}>{errors?.samples?.root.message}</div>
      )}
      <div className={`${styles.samples} `}>
        {fields.map((row, rowIndex) => {
          const storageUuid = watch(`samples.${rowIndex}.storageUuid`);
          return (
            <Tile
              className={`${styles.sample} ${
                rowIndex % 2 == 0 ? styles.AltRow : ""
              }`}
              key={row.id}
            >
              {canEdit && (
                <>
                  <ConceptMembersSelector
                    popUpDrirection="bottom"
                    concept={sampleTypeConcept}
                    selectedId={row?.sampleTypeUuid}
                    selectedText={row?.sampleTypeName}
                    controllerName={`samples.${rowIndex}.sampleTypeUuid`}
                    name={`samples.${rowIndex}.sampleTypeUuid`}
                    control={control}
                    title=""
                    onChange={(e) =>
                      onSampleTypeChange(fields[rowIndex], rowIndex, e)
                    }
                    placeholder={t(
                      "laboratorySpecifySampleType",
                      "Sample Type"
                    )}
                    invalid={!!errors?.samples?.[rowIndex]?.sampleTypeUuid}
                    invalidText={
                      errors?.samples?.[rowIndex]?.sampleTypeUuid &&
                      errors?.samples?.[rowIndex]?.sampleTypeUuid?.message
                    }
                  />
                </>
              )}
              {!canEdit && row?.sampleTypeName}

              {canEdit && (
                <ControlledTextInput
                  id={`id-samples.${rowIndex}.externalRef`}
                  readOnly={!canEdit}
                  name={`samples.${rowIndex}.externalRef`}
                  control={control}
                  controllerName={`samples.${rowIndex}.externalRef`}
                  maxLength={100}
                  size={"sm"}
                  value={row?.externalRef ?? ""}
                  labelText=""
                  placeholder={t(
                    "laboratoryExternalRef",
                    "Sample Reference Number"
                  )}
                  invalid={!!errors?.samples?.[rowIndex]?.externalRef}
                  invalidText={
                    errors?.samples?.[rowIndex]?.externalRef &&
                    errors?.samples?.[rowIndex]?.externalRef?.message
                  }
                  onChange={(e) =>
                    onExternalRefChange(
                      fields[rowIndex],
                      rowIndex,
                      e.target.value
                    )
                  }
                />
              )}
              {!canEdit && row?.externalRef}

              {canEdit && (
                <ControlledAccessionNumber
                  id={`id-samples.${rowIndex}.accessionNumber`}
                  readOnly={!canEdit}
                  name={`samples.${rowIndex}.accessionNumber`}
                  control={control}
                  controllerName={`samples.${rowIndex}.accessionNumber`}
                  maxLength={100}
                  size={"sm"}
                  value={row?.accessionNumber ?? ""}
                  labelText=""
                  placeholder={t(
                    "laboratoryGenerateInternalReference",
                    "Generate Internal Reference"
                  )}
                  invalid={!!errors?.samples?.[rowIndex]?.accessionNumber}
                  invalidText={
                    errors?.samples?.[rowIndex]?.accessionNumber &&
                    errors?.samples?.[rowIndex]?.accessionNumber?.message
                  }
                  onChange={(e) =>
                    onAccessionNumberChange(
                      fields[rowIndex],
                      rowIndex,
                      e as string
                    )
                  }
                />
              )}
              {!canEdit && row?.accessionNumber}

              {canEdit && (
                <>
                  {isLoadingTestOptions && <TextInputSkeleton />}
                  {!isLoadingTestOptions && testOptions && locations && (
                    <TestsSelector
                      id={`samples.${rowIndex}.tests`}
                      name={`samples.${rowIndex}.tests`}
                      control={control}
                      locations={locations}
                      availableTests={testOptions}
                      controllerName={`samples.${rowIndex}.tests`}
                      defaultValue={row.tests as DiagonisticCenterTests}
                      updateValue={(value) => {
                        setValue(`samples.${rowIndex}.tests`, value);
                        onTestsChanged(value, rowIndex);
                      }}
                      onChange={(v) => onTestsChanged(v, rowIndex)}
                      title=""
                      placeholder={t(
                        "laboratoryRequestChooseTests",
                        "Choose tests"
                      )}
                      invalid={!!errors?.samples?.[rowIndex]?.tests}
                      invalidText={
                        errors?.samples?.[rowIndex]?.tests &&
                        errors?.samples?.[rowIndex]?.tests?.message
                      }
                    />
                  )}
                </>
              )}
              {!canEdit &&
                Object.entries(row.tests as DiagonisticCenterTests).map(
                  ([key, value]) =>
                    !key.startsWith("NEW") ? (
                      <section key={key} className={styles.locationLabRequest}>
                        <LocationTests
                          readonly={true}
                          center={value.center}
                          tests={value.tests}
                          showLocation={true}
                          deleteAllTests={() => {}}
                          deleteTest={() => {}}
                        />
                      </section>
                    ) : (
                      <></>
                    )
                )}

              {canArchiveSamples && (
                <>
                  <div>
                    <ControlledCheckBox
                      controllerName={`samples.${rowIndex}.archiveSample`}
                      name={`samples.${rowIndex}.archiveSample`}
                      labelText={t("laboratoryArchiveSample", "Archive Sample")}
                      control={control}
                      onChange={() => {
                        setValue(`samples.${rowIndex}.storageUuid`, null);
                        setValue(`samples.${rowIndex}.storageUnitUuid`, null);
                      }}
                    />
                  </div>

                  <div>
                    {Boolean(getValue(`samples.${rowIndex}.archiveSample`)) && (
                      <>
                        <ControlledStorageSelector
                          controllerName={`samples.${rowIndex}.storageUuid`}
                          active={true}
                          name={`samples.${rowIndex}.storageUuid`}
                          control={control}
                          hideLabel={true}
                          title={""}
                          placeholder={t(
                            "laboratoryRepositoryStorage",
                            "Storage"
                          )}
                          onChange={() => {
                            setValue(
                              `samples.${rowIndex}.storageUnitUuid`,
                              null
                            );
                          }}
                          invalid={!!errors?.samples?.[rowIndex]?.storageUuid}
                          invalidText={
                            errors?.samples?.[rowIndex]?.storageUuid?.message
                          }
                          direction="top"
                        />
                        {storageUuid && (
                          <ControlledStorageUnitSelector
                            key={`samples.${rowIndex}.storageUnitUuid-${storageUuid}`}
                            controllerName={`samples.${rowIndex}.storageUnitUuid`}
                            storageUuid={storageUuid}
                            active={true}
                            assigned={false}
                            name={`samples.${rowIndex}.storageUnitUuid`}
                            control={control}
                            title={""}
                            hideLabel={true}
                            placeholder={t(
                              "laboratoryRepositoryStorageUnit",
                              "Storage Unit"
                            )}
                            invalid={
                              !!errors?.samples?.[rowIndex]?.storageUnitUuid
                            }
                            invalidText={
                              errors?.samples?.[rowIndex]?.storageUnitUuid
                                ?.message
                            }
                            direction="top"
                          />
                        )}
                      </>
                    )}
                  </div>
                </>
              )}

              {canEdit && (
                <div className={styles.sampleRemove}>
                  <Button
                    type="button"
                    size="sm"
                    iconDescription={"Delete"}
                    kind="ghost"
                    renderIcon={TrashCan}
                    onClick={(e) => onRemoveItem(row, rowIndex, e)}
                  >
                    {t("laboratorySampleRemove", "Remove")}
                  </Button>
                </div>
              )}
            </Tile>
          );
        })}
      </div>
    </>
  );
};

export default SampleItemsTable;
