import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Edit } from "@carbon/react/icons";

import {
  ConfigurableLink,
  formatDate,
  launchWorkspace,
  parseDate,
  restBaseUrl,
  showSnackbar,
  usePagination,
} from "@openmrs/esm-framework";
import {
  DataTable,
  DataTableSkeleton,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableSelectAll,
  TableSelectRow,
  TableToolbarContent,
  Layer,
  Tile,
  Button,
  TableExpandHeader,
  TableExpandRow,
  TableExpandedRow,
  InlineLoading,
  TableToolbarSearch,
  Toggle,
} from "@carbon/react";
import {
  extractErrorMessagesFromResponse,
  getStatusColor,
  handleMutate,
  useOrderDate,
} from "../utils/functions-uganda";
import styles from "./referred-orders-uganda.scss";
import {
  syncAllTestOrderResultsUganda as getAllTestOrderResults,
  syncAllTestOrdersUganda as syncAllTestOrders,
  syncSelectedTestOrderResultsUganda as syncSelectedTestOrderResults,
  syncSelectedTestOrdersUganda as syncSelectedTestOrders,
} from "../api/referred-orders-sync-uganda.resource";
import {
  useGetUgandaReferredOrders,
  UgandaReferredOrderResult,
} from "../api/referred-orders-uganda.resource";

type SyncView = "NOT_SYNCED" | "SYNCED";

interface EditOrderProps {
  order: UgandaReferredOrderResult["order"];
}

const ReferredOrdersUganda: React.FC = () => {
  const { t } = useTranslation();

  const [syncView, setSyncView] = useState<SyncView>("NOT_SYNCED");

  const handleToggleChange = () => {
    setSyncView((prev) => (prev === "NOT_SYNCED" ? "SYNCED" : "NOT_SYNCED"));
  };

  const [isSyncingAllTestOrders, setIsSyncingAllTestOrders] = useState(false);

  const [isSyncingAllTestOrderResults, setIsSyncingAllTestOrderResults] =
    useState(false);

  const [isSyncingSelectedTestOrders, setIsSyncingSelectedTestOrders] =
    useState(false);

  const [
    isSyncingSelectedTestOrderResults,
    setIsSyncingSelectedTestOrderResults,
  ] = useState(false);

  const { currentOrdersDate } = useOrderDate();

  const { data: referredOrderList, isLoading } = useGetUgandaReferredOrders(
    syncView === "NOT_SYNCED" ? "IN_PROGRESS" : "RECEIVED",
    currentOrdersDate
  );

  const pageSizes = [10, 20, 30, 40, 50];

  const [currentPageSize, setPageSize] = useState(10);

  const {
    goTo,
    results: paginatedReferredOrderEntries,
    currentPage,
  } = usePagination(referredOrderList, currentPageSize);

  const EditOrder: React.FC<EditOrderProps> = ({ order }) => {
    const handleLaunchWorkspace = useCallback(() => {
      launchWorkspace("pick-order-form-workspace", {
        order,
        isEdit: true,
      });
    }, [order]);
    return (
      <Button
        kind="ghost"
        renderIcon={(props) => <Edit size={16} {...props} />}
        onClick={handleLaunchWorkspace}
      />
    );
  };

  const handleSyncSelectedTestOrders = async (selectedRows: any[]) => {
    if (selectedRows.length === 0) {
      showSnackbar({
        title: t("syncStatus", "Sync Status"),
        subtitle: t("syncStatus", "No rows selected to sync."),
        kind: "error",
      });
      return;
    }

    const idsToSync = selectedRows.map((row) => row.id);
    setIsSyncingSelectedTestOrders(true);

    await syncSelectedTestOrders(idsToSync)
      .then((res) => {
        if (![200, 201].includes(res.status)) {
          const message =
            res?.data?.responseList?.[0]?.responseMessage ||
            t("syncFailed", "Failed to sync test orders.");
          throw new Error(message);
        }

        showSnackbar({
          title: t("syncSuccess", "Sync successful"),
          subtitle: t("syncSuccess", "Test orders synced successfully."),
          kind: "success",
        });
        handleMutate(`${restBaseUrl}/referredorders`);
      })
      .catch((error) => {
        const errorMessages = extractErrorMessagesFromResponse(error);
        showSnackbar({
          title: t("syncStatus", "Sync Status"),
          subtitle:
            errorMessages.join(", ") ||
            t("syncFailed", "An unexpected error occurred."),
          kind: "error",
        });
        handleMutate(`${restBaseUrl}/referredorders`);
      })
      .finally(() => {
        setIsSyncingSelectedTestOrders(false);
      });
  };

  const handleSyncSelectedTestOrderResults = async (selectedRows: any[]) => {
    if (selectedRows.length === 0) {
      showSnackbar({
        title: t("syncStatus", "Sync Status"),
        subtitle: t("syncStatus", "No rows selected to sync."),
        kind: "error",
      });
      return;
    }

    const idsToSync = selectedRows.map((row) => row.id);
    setIsSyncingSelectedTestOrderResults(true);

    await syncSelectedTestOrderResults(idsToSync)
      .then((res) => {
        if (![200, 201].includes(res.status)) {
          const message =
            res?.data?.responseList?.[0]?.responseMessage ||
            t("syncFailed", "Failed to sync test result orders.");
          throw new Error(message);
        }

        showSnackbar({
          title: t("syncSuccess", "Sync successful"),
          subtitle: t(
            "syncSuccess",
            "Test orders results synced successfully."
          ),
          kind: "success",
        });
        handleMutate(`${restBaseUrl}/referredorders`);
      })
      .catch((error) => {
        const errorMessages = extractErrorMessagesFromResponse(error);
        showSnackbar({
          title: t("syncStatus", "Sync Status"),
          subtitle:
            errorMessages.join(", ") ||
            t("syncFailed", "An unexpected error occurred."),
          kind: "error",
        });
        handleMutate(`${restBaseUrl}/referredorders`);
      })
      .finally(() => {
        setIsSyncingSelectedTestOrderResults(false);
      });
  };

  const handleSyncAllTestOrders = async () => {
    setIsSyncingAllTestOrders(true);

    await syncAllTestOrders()
      .then((res) => {
        if (![200, 201].includes(res.status)) {
          const message =
            res?.data?.responseList?.[0]?.responseMessage ||
            "Failed to sync test orders.";
          throw new Error(message);
        }

        showSnackbar({
          title: t("syncSuccess", "Sync successful"),
          subtitle: t("syncSuccess", "Test orders synced successfully."),
          kind: "success",
        });
        handleMutate(`${restBaseUrl}/referredorders`);
      })
      .catch((error) => {
        const errorMessages = extractErrorMessagesFromResponse(error);
        showSnackbar({
          title: t("syncStatus", "Sync Status"),
          subtitle:
            errorMessages.join(", ") ||
            t("syncFailed", "An unexpected error occurred."),
          kind: "error",
        });
        handleMutate(`${restBaseUrl}/referredorders`);
      })
      .finally(() => {
        setIsSyncingAllTestOrders(false);
      });
  };

  const handleSyncAllTestOrderResults = async () => {
    setIsSyncingAllTestOrderResults(true);

    await getAllTestOrderResults()
      .then((res) => {
        if (![200, 201].includes(res.status)) {
          const message =
            res?.data?.responseList?.[0]?.responseMessage ||
            "Failed to sync test orders.";
          throw new Error(message);
        }

        showSnackbar({
          title: t("syncSuccess", "Sync successful"),
          subtitle: t("syncSuccess", "Test order results synced successfully."),
          kind: "success",
        });
        handleMutate(`${restBaseUrl}/referredorders`);
      })
      .catch((error) => {
        const errorMessages = extractErrorMessagesFromResponse(error);
        showSnackbar({
          title: t("syncStatus", "Sync Status"),
          subtitle:
            errorMessages.join(", ") ||
            t("syncFailed", "An unexpected error occurred."),
          kind: "error",
        });
        handleMutate(`${restBaseUrl}/referredorders`);
      })
      .finally(() => {
        setIsSyncingAllTestOrderResults(false);
      });
  };

  // table columns
  const columns = [
    { id: 0, header: t("date", "Date"), key: "date" },
    { id: 1, header: t("orderNumber", "Order Number"), key: "orderNumber" },
    { id: 2, header: t("patient", "Patient"), key: "patient" },
    { id: 3, header: t("artNumber", "Art Number"), key: "artNumber" },
    {
      id: 4,
      header: t("accessionNumber", "Accession Number"),
      key: "accessionNumber",
    },
    { id: 5, header: t("test", "Test"), key: "test" },
    { id: 6, header: t("status", "Status"), key: "status" },
    { id: 7, header: t("orderer", "Ordered By"), key: "orderer" },
    { id: 8, header: t("actions", "Actions"), key: "actions" },
    { id: 9, header: t("message", "Message"), key: "message" },
  ];

  const tableRows = useMemo(() => {
    return paginatedReferredOrderEntries.map((entry, index) => ({
      ...entry,
      id: entry?.order?.uuid,
      date: formatDate(parseDate(entry?.order?.dateActivated), {
        mode: "standard",
        time: true,
      }),
      patient: (
        <ConfigurableLink
          to={`\${openmrsSpaBase}/patient/${entry?.order?.patient?.uuid}/chart/laboratory-orders`}
        >
          {entry?.order?.patient?.display.split("-")[1]}
        </ConfigurableLink>
      ),
      artNumber: entry?.order?.patient?.identifiers
        .find(
          (item) =>
            item?.identifierType?.uuid ===
            "e1731641-30ab-102d-86b0-7a5022ba4115"
        )
        ?.display.split("=")[1]
        .trim(),
      orderNumber: entry?.order?.orderNumber,
      accessionNumber: entry?.order?.accessionNumber,
      test: entry?.order?.concept?.display,
      action: entry?.order?.action,
      status: (
        <span
          className={styles.statusContainer}
          style={{ color: `${getStatusColor(entry?.order?.fulfillerStatus)}` }}
        >
          {entry?.order?.fulfillerStatus}
        </span>
      ),
      orderer: entry?.order?.orderer?.display,
      orderType: entry?.order?.orderType?.display,
      actions: (
        <EditOrder order={paginatedReferredOrderEntries[index]?.order} />
      ),
      message: paginatedReferredOrderEntries[index]?.syncTask?.status,
    }));
  }, [paginatedReferredOrderEntries]);

  if (isLoading) {
    return <DataTableSkeleton role="progressbar" />;
  }

  if (paginatedReferredOrderEntries?.length >= 0) {
    return (
      <DataTable rows={tableRows} headers={columns} useZebraStyles isSelectable>
        {({
          rows,
          headers,
          getHeaderProps,
          getTableProps,
          getSelectionProps,
          getRowProps,
          selectedRows,
          onInputChange,
        }) => (
          <TableContainer className={styles.tableContainer}>
            <TableToolbar style={{ position: "static" }}>
              <TableToolbarContent>
                <Layer
                  style={{
                    margin: "5px",
                  }}
                >
                  <Toggle
                    className={styles.toggle}
                    labelA="Not Synced"
                    labelB="Synced"
                    id="sync-toggle"
                    toggled={syncView === "SYNCED"}
                    onToggle={handleToggleChange}
                  />
                </Layer>

                {/* selected implementation */}
                {syncView === "NOT_SYNCED" && (
                  <Layer
                    style={{
                      margin: "5px",
                    }}
                  >
                    {isSyncingSelectedTestOrders ? (
                      <InlineLoading
                        description={t("syncing", "Syncing...")}
                        status="active"
                      />
                    ) : (
                      <Button
                        size="sm"
                        className={styles.button}
                        onClick={() =>
                          handleSyncSelectedTestOrders(selectedRows)
                        }
                      >
                        {t("syncSelected", "Sync Selected Orders")}
                      </Button>
                    )}
                  </Layer>
                )}

                {syncView === "SYNCED" && (
                  <Layer
                    style={{
                      margin: "5px",
                    }}
                  >
                    {isSyncingSelectedTestOrderResults ? (
                      <InlineLoading
                        description={t("syncing", "Syncing...")}
                        status="active"
                      />
                    ) : (
                      <Button
                        size="sm"
                        className={styles.button}
                        onClick={() =>
                          handleSyncSelectedTestOrderResults(selectedRows)
                        }
                      >
                        {t("resultsForSelected", "Get Results For Selected")}
                      </Button>
                    )}
                  </Layer>
                )}
                {/* all implementation */}

                {syncView === "SYNCED" && (
                  <Layer
                    style={{
                      margin: "5px",
                    }}
                  >
                    {isSyncingAllTestOrderResults ? (
                      <InlineLoading
                        description={t("syncing", "Syncing...")}
                        status="active"
                      />
                    ) : (
                      <Button
                        size="sm"
                        className={styles.button}
                        onClick={() => {
                          handleSyncAllTestOrderResults();
                        }}
                      >
                        {t("syncAllResults", "Get All Results")}
                      </Button>
                    )}
                  </Layer>
                )}

                {syncView === "NOT_SYNCED" && (
                  <Layer
                    style={{
                      margin: "5px",
                    }}
                  >
                    {isSyncingAllTestOrders ? (
                      <InlineLoading
                        description={t("syncing", "Syncing...")}
                        status="active"
                      />
                    ) : (
                      <Button
                        size="sm"
                        className={styles.button}
                        onClick={() => handleSyncAllTestOrders()}
                      >
                        {t("syncAll", "Sync All Orders")}
                      </Button>
                    )}
                  </Layer>
                )}

                <Layer style={{ margin: "5px" }}>
                  <TableToolbarSearch
                    expanded
                    onChange={onInputChange}
                    placeholder={t("searchThisList", "Search this list")}
                    size="sm"
                  />
                </Layer>
              </TableToolbarContent>
            </TableToolbar>

            <Table {...getTableProps()} className={styles.activePatientsTable}>
              <TableHead>
                <TableRow>
                  <TableExpandHeader />
                  <TableSelectAll {...getSelectionProps()} />
                  {headers.map((header) => (
                    <TableHeader {...getHeaderProps({ header })}>
                      {header.header?.content ?? header.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {rows.map((row, index) => (
                  <React.Fragment key={row.id}>
                    {/* Main Row with Expand and Select */}
                    <TableExpandRow {...getRowProps({ row })}>
                      <TableSelectRow {...getSelectionProps({ row })} />
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id}>
                          {cell.value?.content ?? cell.value}
                        </TableCell>
                      ))}
                    </TableExpandRow>

                    {/* Expanded Content Row */}
                    {row.isExpanded && (
                      <TableExpandedRow colSpan={headers.length + 2}>
                        <div style={{ padding: "1rem" }}>
                          {paginatedReferredOrderEntries[index]?.syncTask ===
                          null
                            ? "Not Synced"
                            : paginatedReferredOrderEntries[index]?.syncTask
                                .status}
                        </div>
                      </TableExpandedRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>

            {/* No Rows Message */}
            {rows.length === 0 && (
              <div className={styles.tileContainer}>
                <Tile className={styles.tile}>
                  <div className={styles.tileContent}>
                    <p className={styles.content}>
                      {t(
                        "noWorklistsToDisplay",
                        "No worklists orders to display"
                      )}
                    </p>
                  </div>
                </Tile>
              </div>
            )}

            {/* Pagination */}
            <Pagination
              forwardText="Next page"
              backwardText="Previous page"
              page={currentPage}
              pageSize={currentPageSize}
              pageSizes={pageSizes}
              totalItems={referredOrderList?.length}
              className={styles.pagination}
              onChange={({ pageSize, page }) => {
                if (pageSize !== currentPageSize) {
                  setPageSize(pageSize);
                }
                if (page !== currentPage) {
                  goTo(page);
                }
              }}
            />
          </TableContainer>
        )}
      </DataTable>
    );
  }
};

export default ReferredOrdersUganda;
