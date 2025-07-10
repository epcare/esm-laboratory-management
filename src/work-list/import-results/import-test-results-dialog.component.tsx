import React, { ChangeEvent, useMemo, useState } from "react";
import styles from "./import-test-results-dialog.component.scss";
import {
  Button,
  ModalBody,
  ModalFooter,
  ModalHeader,
  InlineLoading,
  Select,
  SelectItem,
  FileUploader,
  TextInput,
} from "@carbon/react";
import { useTranslation } from "react-i18next";
import { uploadTestImportConfigurations } from "../../api/test-import-config.resource";
import {
  TestResultImportConceptMapping,
  TestResultImportConfig,
  TestResultImportConfigMapping,
  TestResultImportConfigMappingHeaders,
} from "../../api/types/test-result-import-config";
import { showNotification } from "@openmrs/esm-framework";
import { extractErrorMessagesFromResponse } from "../../utils/functions";
import ImportTestResultsConfig from "./import-test-results.config.component";

interface ImportTestResultsProps {
  availableTests: Array<[testUuid: string, testName: string]>;
  closeModal: () => void;
  loadTestResults: (
    mapping: TestResultImportConceptMapping,
    headers: Array<TestResultImportConfigMappingHeaders>,
    sampleIdField: string,
    rows: Array<Array<string>>
  ) => string;
}

enum ImportTestResultsStep {
  SELECT_TEST,
  CONFIGURE_FIELDS,
  SAVE,
}

const ImportTestResults: React.FC<ImportTestResultsProps> = ({
  availableTests,
  closeModal,
  loadTestResults,
}) => {
  const { t } = useTranslation();
  const [selectedTest, setSelectedTest] = useState<string>(() => {
    return availableTests?.length == 1 ? availableTests[0][0] : "";
  });
  const [step, setStep] = useState<ImportTestResultsStep>(
    ImportTestResultsStep.SELECT_TEST
  );
  const [isBusy, setIsBusy] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>();
  const [fileSelected, setFileSelected] = useState(false);
  const [separator, setSeparator] = useState(",");
  const [quotableChar, setQuotableChar] = useState('"');
  const [testResultImportConfig, setTestResultImportConfig] =
    useState<TestResultImportConfig>();
  const [csvFields, setCsvFields] = useState<TestResultImportConfigMapping>();

  const onFileChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event?.target?.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFileSelected(true);
    } else {
      event.preventDefault();
    }
  };

  const onFileDeleted = () => {
    setFileSelected(false);
  };

  const disableNextButtom = useMemo(() => {
    if (step == ImportTestResultsStep.SELECT_TEST) {
      return !(fileSelected && selectedTest && separator && quotableChar);
    }
    return true;
  }, [step, fileSelected, selectedTest, separator, quotableChar]);

  const handleFileUpload = async () => {
    try {
      if (!selectedFile || !separator || !quotableChar || !fileSelected) {
        return;
      }
      const formData = new FormData();
      formData.append("testUuid", selectedTest);
      formData.append("separator", separator);
      formData.append("quoteChar", quotableChar);
      formData.append("file", selectedFile, "test-results.csv");
      setIsBusy(true);
      let result = await uploadTestImportConfigurations(formData);
      setTestResultImportConfig(result.data);
      setCsvFields(JSON.parse(result?.data?.fieldMapping));
      setStep(ImportTestResultsStep.CONFIGURE_FIELDS);
    } catch (error) {
      showNotification({
        title: t(
          "laboratoryUploadTestResultConfigError",
          "Error uploading test results"
        ),
        kind: "error",
        critical: true,
        description: error?.message,
      });
    } finally {
      setIsBusy(false);
    }
  };

  return step == ImportTestResultsStep.SELECT_TEST ? (
    <div className={`${styles.modalWrapper}`}>
      <ModalHeader
        closeModal={closeModal}
        title={t("laboratoryTestResultsImport", "Import Test Results")}
      ></ModalHeader>
      <ModalBody className={styles.modalBody}>
        <section className={styles.section}>
          <Select
            type="text"
            labelText={t(
              "laboratoryTestResultsImportSpecifyTest",
              "Specify Test"
            )}
            value={selectedTest}
            rules={{ required: true }}
            onChange={(event) => setSelectedTest(event.target.value)}
          >
            <SelectItem
              value={""}
              text={t("laboratoryTestResultsImportSelectTest", "Select Test")}
            />
            {(availableTests ?? [])?.map(([testUuid, testName]) => {
              return (
                <SelectItem key={testUuid} value={testUuid} text={testName} />
              );
            })}
          </Select>
          <div className={styles.sepQuote}>
            <TextInput
              maxLength={1}
              labelText={t(
                "laboratoryTestResultsImportSeparator",
                "Field Separator"
              )}
              value={separator}
              placeholder={""}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setSeparator(e.target.value);
              }}
            />

            <TextInput
              labelText={t(
                "laboratoryTestResultsImporQuotableChar",
                "Quote Character"
              )}
              value={quotableChar}
              placeholder={""}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setQuotableChar(e.target.value);
              }}
            />
          </div>
          <FileUploader
            accept={[".csv"]}
            multiple={false}
            name={"file"}
            buttonLabel="Select file"
            labelDescription="Only .csv files at 2mb or less"
            filenameStatus="edit"
            labelTitle=""
            size="small"
            onChange={onFileChanged}
            onDelete={onFileDeleted}
          />
        </section>
      </ModalBody>
      <ModalFooter>
        <Button disabled={isBusy} kind="secondary" onClick={closeModal}>
          {t("cancel", "Cancel")}
        </Button>
        <Button
          disabled={disableNextButtom}
          type="submit"
          onClick={handleFileUpload}
        >
          {isBusy ? <InlineLoading /> : t("upload", "Upload")}
        </Button>
      </ModalFooter>
    </div>
  ) : step == ImportTestResultsStep.CONFIGURE_FIELDS ? (
    <ImportTestResultsConfig
      closeModal={closeModal}
      csvFields={csvFields}
      testResultImportConfig={testResultImportConfig}
      loadTestResults={loadTestResults}
    />
  ) : (
    <></>
  );
};

export default ImportTestResults;
