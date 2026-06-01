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
} from "../utils/functions-uganda";
import { useOrderDate } from "../hooks/useOrderDate";
import styles from "./referred-orders-sync.scss";
import {
  syncAllTestOrderResultsUganda as getAllTestOrderResults,
  syncAllTestOrdersUganda as syncAllTestOrders,
  syncSelectedTestOrderResultsUganda as syncSelectedTestOrderResults,
  syncSelectedTestOrdersUganda as syncSelectedTestOrders,
} from "../api/referred-orders-sync-uganda.resource";
import {
  useGetUgandaReferredOrders,
  UgandaReferredOrderResult,
} from "../api/referred-orders-sync-api.resource";

type SyncView = "NOT_SYNCED" | "SYNCED";

interface EditOrderProps {
  order: UgandaReferredOrderResult["order"];
}

const ReferredOrdersSync: React.FC = () => {
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

  const currentApiStatus =
    syncView === "NOT_SYNCED" ? "IN_PROGRESS" : "RECEIVED";

  const [searchQuery, setSearchQuery] = useState("");

  const { data: referredOrderList, isLoading } = useGetUgandaReferredOrders(
    currentApiStatus,
    currentOrdersDate
  );

  // Filter orders based on search query across all columns
  const filteredOrders = useMemo(() => {
    if (!searchQuery || searchQuery.trim() === "") {
      return referredOrderList;
    }

    const lowerQuery = searchQuery.toLowerCase();

    return referredOrderList.filter((entry) => {
      // Search in date
      const date = formatDate(parseDate(entry?.order?.dateActivated), {
        mode: "standard",
        time: true,
      });
      if (date?.toLowerCase().includes(lowerQuery)) return true;

      // Search in order number
      if (entry?.order?.orderNumber?.toLowerCase().includes(lowerQuery))
        return true;

      // Search in patient name/display
      if (entry?.order?.patient?.display?.toLowerCase().includes(lowerQuery))
        return true;

      // Search in ART number
      const artNumber = entry?.order?.patient?.identifiers
        ?.find(
          (item) =>
            item?.identifierType?.uuid ===
            "e1731641-30ab-102d-86b0-7a5022ba4115"
        )
        ?.display.split("=")[1]
        ?.trim()
        ?.toLowerCase();
      if (artNumber?.includes(lowerQuery)) return true;

      // Search in accession number
      if (entry?.order?.accessionNumber?.toLowerCase().includes(lowerQuery))
        return true;

      // Search in test name
      if (entry?.order?.concept?.display?.toLowerCase().includes(lowerQuery))
        return true;

      // Search in status
      if (entry?.order?.fulfillerStatus?.toLowerCase().includes(lowerQuery))
        return true;

      // Search in orderer
      if (entry?.order?.orderer?.display?.toLowerCase().includes(lowerQuery))
        return true;

      // Search in sync task status/message
      if (entry?.syncTask?.status?.toLowerCase().includes(lowerQuery))
        return true;

      return false;
    });
  }, [referredOrderList, searchQuery]);

  const pageSizes = [10, 20, 30, 40, 50];

  const [currentPageSize, setPageSize] = useState(10);

  const {
    goTo,
    results: paginatedReferredOrderEntries,
    currentPage,
  } = usePagination(filteredOrders, currentPageSize);

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
                <div className={styles.toolbarSearch} id={styles.referralSearch}>
                  <TableToolbarSearch
                    expanded
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("searchThisList", "Search this list")}
                    size="sm"
                  />
                </div>
                <div className={styles.toolbarFilters}>
                  <Toggle
                    className={styles.toggle}
                    labelA="Not Synced"
                    labelB="Synced"
                    id="sync-toggle"
                    toggled={syncView === "SYNCED"}
                    onToggle={handleToggleChange}
                  />

                  {/* selected implementation */}
                  {syncView === "NOT_SYNCED" && (
                    <>
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
                    </>
                  )}

                  {syncView === "SYNCED" && (
                    <>
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
                    </>
                  )}
                  {/* all implementation */}

                  {syncView === "SYNCED" && (
                    <>
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
                    </>
                  )}

                  {syncView === "NOT_SYNCED" && (
                    <>
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
                    </>
                  )}
                </div>
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
                      {searchQuery
                        ? t(
                            "noSearchResults",
                            "No results found for your search"
                          )
                        : t(
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
              totalItems={filteredOrders?.length}
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

export default ReferredOrdersSync;
