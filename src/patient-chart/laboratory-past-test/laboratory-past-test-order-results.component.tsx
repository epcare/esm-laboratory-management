import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./laboratory-past-test-order-results.scss";
import { ErrorState, showModal, launchWorkspace } from "@openmrs/esm-framework";
import { mutate } from "swr";
import {
  DataTable,
  DataTableSkeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  Layer,
  Tag,
  Tile,
  Pagination,
  TableExpandHeader,
  TableExpandRow,
  TableExpandedRow,
  Button,
  InlineLoading,
} from "@carbon/react";

import { MailAll, Add, Checkmark, SendAlt, NotSent } from "@carbon/react/icons";

import TestsResults from "../results-summary/test-results-table.component";

import { CardHeader } from "@openmrs/esm-patient-common-lib";
import { useLaboratoryConfig } from "../../hooks/useLaboratoryConfig";
import { useTestRequestResource } from "../../api/test-request.resource";
import {
  formatAsPlainDateForTransfer,
  formatDateTimeForDisplay,
} from "../../utils/date-utils";
import PrintTestRequestButton from "../../print/print-test-request-action-button.component";
import TestNameTag from "../../components/test-request/test-name-tag";
import { URL_LAB_REQUESTS_ALL_ABS_REQUEST_NO } from "../../config/urls";
import { ResourceRepresentation } from "../../api/resource-filter-criteria";

interface LaboratoryActiveTestOrderResultsProps {
  patientUuid: string;
}

const LaboratoryPastTestOrderResults: React.FC<
  LaboratoryActiveTestOrderResultsProps
> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const {
    laboratoryConfig: { enableSendingLabTestsByEmail },
    configReady,
  } = useLaboratoryConfig();

  const displayText = t(
    "pastLaboratoryTestsDisplayTextTitle",
    "Past Laboratory Tests"
  );
  const currentDateTime = new Date().getTime();

  const {
    isLoading,
    items,
    currentPageSize,
    pageSizes,
    currentPage,
    setPageSize,
    setCurrentPage,
    totalCount,
    isError,
  } = useTestRequestResource({
    v: ResourceRepresentation.Full,
    minActivatedDate: null,
    maxActivatedDate: new Date(
      new Date().setMilliseconds(0) - 1 * 86400001
    ).toISOString(),
    includeTestItemSamples: false,
    allTests: true,
    includeTestItemTestResult: true,
    testResultApprovals: true,
    includeItemConcept: true,
    patient: patientUuid,
  });

  const handleChange = useCallback((event) => {
    const searchText = event?.target?.value?.trim().toLowerCase();
    setSearchTerm(searchText);
  }, []);

  const launchLabRequestForm = () => {
    launchWorkspace("patient-laboratory-referral-workspace", {
      workspaceTitle: "Lab Request Form",
      mutateForm: () => {
        mutate((key) => true, undefined, {
          revalidate: true,
        });
      },
      /*formInfo: {
        encounterUuid: "",
        formUuid: "c6f3b5ad-b7eb-44ad-b212-fb26456e155b",
      },*/
      patientUuid: patientUuid,
    });
  };

  const EmailButtonAction: React.FC = () => {
    const launchSendEmailModal = useCallback(() => {
      const dispose = showModal("send-email-dialog", {
        closeModal: () => dispose(),
      });
    }, []);

    return (
      <Button
        kind="ghost"
        size="sm"
        onClick={() => launchSendEmailModal()}
        renderIcon={(props) => <MailAll size={16} {...props} />}
      />
    );
  };

  const tableHeaders = useMemo(
    () => [
      {
        id: 0,
        header: t("orderDate", "Test Date"),
        key: "orderDate",
      },
      { id: 1, header: t("tests", "Tests"), key: "orders" },
      { id: 2, header: t("location", "Location"), key: "location" },
      { id: 3, header: t("request#", "Request #"), key: "status" },
      { id: 4, header: t("actions", "Action"), key: "actions" },
      { id: 2, header: "details", key: "details" },
    ],
    [t]
  );

  const tableRows = useMemo(() => {
    return (
      searchTerm
        ? items
            ?.map((p) => {
              return {
                ...p,
                tests: p.tests?.filter(
                  (x) =>
                    x.testName?.toLowerCase()?.includes(searchTerm) ||
                    x.testShortName?.toLowerCase()?.includes(searchTerm)
                ),
              };
            })
            .filter((p) => (p.tests?.length ?? 0) > 0)
        : items
    )
      .sort((a, b) => {
        const dateA = new Date(a.dateCreated);
        const dateB = new Date(b.dateCreated);
        return dateB.getTime() - dateA.getTime();
      })
      .map((entry) => {
        const observartions = entry?.tests
          ?.map((p) => {
            return p.testResult?.obs
              ? {
                  obs: p.testResult?.obs,
                  completed: p.testResult?.completed,
                  remarks: p.testResult?.remarks,
                }
              : null;
          })
          .filter((p) => p);

        return {
          ...entry,
          id: entry.uuid,
          orderDate: formatDateTimeForDisplay(entry.dateCreated),
          orders: (
            <>
              {entry?.tests
                ?.sort((x, y) =>
                  x.requestApprovalRemarks && y.requestApprovalRemarks
                    ? 0
                    : x.requestApprovalRemarks
                    ? 1
                    : -1
                )
                .map((order) => {
                  return (
                    <TestNameTag testRequestItem={order} showRemarks={true} />
                  );
                })}
            </>
          ),

          location: entry.atLocationName,
          status: (
            <div className={styles.status}>
              <div>
                <a
                  href={URL_LAB_REQUESTS_ALL_ABS_REQUEST_NO(
                    entry.requestNo,
                    formatAsPlainDateForTransfer(entry.dateCreated)
                  )}
                  target="_blank"
                >
                  {entry.requestNo}
                </a>
              </div>
            </div>
          ),
          actions: (
            <div style={{ display: "flex" }}>
              <PrintTestRequestButton
                testRequestUuid={entry.uuid}
                enableResults={entry?.tests?.some((p) => p.testResult)}
              />
              {enableSendingLabTestsByEmail && <EmailButtonAction />}
            </div>
          ),
          details:
            observartions?.length > 0 ? (
              <TestsResults obs={observartions} />
            ) : (
              <></>
            ),
        };
      });
  }, [enableSendingLabTestsByEmail, items, searchTerm]);

  if (isLoading || !configReady) {
    return <DataTableSkeleton role="progressbar" />;
  }

  if (isError) {
    return <ErrorState error={isError} headerTitle={"Error"} />;
  }

  if (tableRows?.length >= 0) {
    return (
      <div className={styles.widgetCard}>
        <CardHeader title={displayText}>
          {isLoading ? (
            <span>
              <InlineLoading />
            </span>
          ) : null}
          <div className={styles.buttons}>
            <Button
              kind="ghost"
              renderIcon={(props) => <Add size={16} {...props} />}
              iconDescription="Launch lab Request"
              onClick={launchLabRequestForm}
            >
              {t("add", "Add")}
            </Button>
          </div>
        </CardHeader>

        <DataTable rows={tableRows} headers={tableHeaders} useZebraStyles>
          {({ rows, headers, getHeaderProps, getTableProps, getRowProps }) => (
            <TableContainer className={styles.tableContainer}>
              <TableToolbar
                style={{
                  position: "static",
                  height: "3rem",
                  overflow: "visible",
                  backgroundColor: "color",
                }}
              >
                <TableToolbarContent>
                  <div
                    style={{
                      fontSize: "10px",
                      margin: "5px",
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    Key:
                    <Tag
                      size="sm"
                      style={{
                        background: "#6F6F6F",
                        color: "white",
                      }}
                      title="Result Requested"
                      renderIcon={() => <SendAlt />}
                    >
                      {"Requested"}
                    </Tag>
                    <Tag
                      size="sm"
                      style={{
                        background: "green",
                        color: "white",
                      }}
                      title="Result Complete"
                      renderIcon={() => <Checkmark />}
                    >
                      {"Completed"}
                    </Tag>
                    <Tag
                      size="sm"
                      style={{
                        background: "red",
                        color: "white",
                      }}
                      title="Result Rejected"
                      renderIcon={() => <NotSent />}
                    >
                      {"Rejected"}
                    </Tag>
                  </div>
                  <Layer>
                    <TableToolbarSearch
                      expanded={true}
                      value={searchTerm}
                      onChange={handleChange}
                      placeholder={t("searchThisList", "Search this list")}
                      size="sm"
                    />
                  </Layer>
                </TableToolbarContent>
              </TableToolbar>
              <Table
                {...getTableProps()}
                className={styles.activePatientsTable}
              >
                <TableHead>
                  <TableRow>
                    <TableExpandHeader />
                    {headers.map(
                      (header) =>
                        !header.key.startsWith("details") && (
                          <TableHeader {...getHeaderProps({ header })}>
                            {header.header}
                          </TableHeader>
                        )
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, index) => {
                    return (
                      <React.Fragment key={row.id}>
                        <TableExpandRow {...getRowProps({ row })}>
                          {row.cells.map(
                            (cell) =>
                              !cell?.info?.header.startsWith("details") && (
                                <TableCell key={cell.id}>
                                  {cell.value?.content ?? cell.value}
                                </TableCell>
                              )
                          )}
                        </TableExpandRow>
                        {row.isExpanded &&
                        row.cells[row.cells.length - 1].value ? (
                          <TableExpandedRow
                            className={styles.expandedActiveVisitRow}
                            colSpan={headers.length + 2}
                          >
                            {row.cells[row.cells.length - 1].value}
                          </TableExpandedRow>
                        ) : (
                          <TableExpandedRow
                            className={styles.hiddenRow}
                            colSpan={headers.length + 2}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
              {rows.length === 0 ? (
                <div className={styles.tileContainer}>
                  <Tile className={styles.tile}>
                    <div className={styles.tileContent}>
                      <p className={styles.content}>
                        {t(
                          "noTestOrdersToDisplay",
                          "No test orders to display"
                        )}
                      </p>
                    </div>
                  </Tile>
                </div>
              ) : null}
              <Pagination
                page={currentPage}
                pageSize={currentPageSize}
                pageSizes={pageSizes}
                totalItems={totalCount ?? 0}
                onChange={({ page, pageSize }) => {
                  setCurrentPage(page);
                  setPageSize(pageSize);
                }}
                className={styles.paginationOverride}
              />
            </TableContainer>
          )}
        </DataTable>
      </div>
    );
  }
};

export default LaboratoryPastTestOrderResults;
