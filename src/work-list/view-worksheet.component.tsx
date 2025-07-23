import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Worksheet } from "../api/types/worksheet";
import EditWorksheet from "./edit-worksheet.component";

import { DataTableSkeleton } from "@carbon/react";
import { useTranslation } from "react-i18next";
import { getWorksheets } from "../api/worksheet.resource";
import { ResourceRepresentation } from "../api/resource-filter-criteria";
import { FetchResponse, showNotification } from "@openmrs/esm-framework";
import { extractErrorMessagesFromResponse } from "../utils/functions";
import { PageableResult } from "../api/types/pageable-result";

const ViewWorksheet = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const [worksheet, setWorksheet] = useState<Worksheet>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadWorksheet() {
      try {
        setIsLoading(true);
        const response: FetchResponse<PageableResult<Worksheet>> =
          await getWorksheets({
            v: ResourceRepresentation.Full,
            worksheet: id,
            allItems: true,
            includeWorksheetItemTestResult: true,
          });
        if (response?.data && response?.data?.results?.length > 0) {
          setWorksheet(response?.data?.results[0]);
        }
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
        showNotification({
          title: t("laboratoryLoadWorksheetError", "Error loading worksheet"),
          kind: "error",
          critical: true,
          description: error?.message,
        });
      }
    }
    loadWorksheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (isLoading) {
    // eslint-disable-next-line no-console
    return <DataTableSkeleton role="progressbar" />;
  }
  return (
    <>
      {!worksheet && (
        <>{t("laboratoryWorksheetNotFound", "Worksheet not found")}</>
      )}
      {worksheet && <EditWorksheet key={id} model={worksheet} />}
    </>
  );
};

export default ViewWorksheet;
