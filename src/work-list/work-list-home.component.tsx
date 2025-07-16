import React from "react";
import { useTranslation } from "react-i18next";
import { Catalog, Customer } from "@carbon/react/icons";

import { Button } from "@carbon/react";
import styles from "./work-list.scss";
import { navigate } from "@openmrs/esm-framework";
import {
  URL_LAB_WORKLIST_REQUESTS,
  URL_LAB_WORKLIST_REQUESTS_ABS,
  URL_LAB_WORKSHEET,
  URL_LAB_WORKSHEET_ABS,
} from "../config/urls";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import TestRequestWorklist from "./test-request-worklist.component";
import WorksheetList from "./worksheet-list.component";
import NewWorksheet from "./new-worksheet.component";
import ViewWorksheet from "./view-worksheet.component";

interface WorklistProps {}

const WorkListHome: React.FC<WorklistProps> = () => {
  const { t } = useTranslation();
  const { pathname: currentUrlPath } = useLocation();
  const worksheetsSelected = currentUrlPath.startsWith(URL_LAB_WORKSHEET);
  return (
    <>
      <div className={styles.navigationButtons}>
        <Button
          size="sm"
          className={styles.navigationButton}
          iconDescription="Requests"
          hasIcon={true}
          renderIcon={(props) => <Customer {...props} size={16} />}
          kind={worksheetsSelected ? "ghost" : "secondary"}
          onClick={() =>
            navigate({
              to: URL_LAB_WORKLIST_REQUESTS_ABS,
            })
          }
        >
          {t("laboratoryWorklistRequests", "Requests")}
        </Button>
        <Button
          size="sm"
          className={styles.navigationButton}
          iconDescription="Worksheets"
          hasIcon={true}
          renderIcon={(props) => <Catalog {...props} size={16} />}
          kind={worksheetsSelected ? "secondary" : "ghost"}
          onClick={() =>
            navigate({
              to: URL_LAB_WORKSHEET_ABS,
            })
          }
        >
          {t("laboratoryWorksheets", "Worksheets")}
        </Button>
      </div>
      <Routes>
        <Route path={"worksheets/new"} element={<NewWorksheet />} />
        <Route path={"worksheets/:id"} element={<ViewWorksheet />} />
        <Route path={"worksheets"} element={<WorksheetList />} />
        <Route path={"/requests"} element={<TestRequestWorklist />} />
        <Route
          key="default-route"
          path={"*"}
          element={<Navigate to={URL_LAB_WORKLIST_REQUESTS} />}
        />
      </Routes>
    </>
  );
};

export default WorkListHome;
