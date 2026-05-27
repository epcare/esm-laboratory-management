import {
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
  TableSelectAll,
  TableSelectRow,
  TableExpandHeader,
  TableExpandRow,
  TableExpandedRow,
} from "@carbon/react";
import { isDesktop } from "@openmrs/esm-framework";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "../tests-ordered/laboratory-queue.scss";
import { TestRequestItem } from "../api/types/test-request-item";
import { TestRequestSelection } from "../api/test-request.resource";
import { TestRequest } from "../api/types/test-request";
import TestResultInfo from "../components/test-request/test-result-info.component";
import TestResultApprovalList from "../review-list/test-result-approval-list.component";

interface TestRequestReferredItemListProps {
  tests: Array<TestRequestItem>;
  tableHeaders: Array<{ id: number; header: string; key: string }>;
  canApproveTestRequests: boolean;
  onSelectionChange: React.Dispatch<React.SetStateAction<TestRequestSelection>>;
  selectedItems: TestRequestSelection;
  testRequestId: string;
  enableSelection?: boolean;
  testRequest?: TestRequest;
}

const TestRequestReferredItemList: React.FC<
  TestRequestReferredItemListProps
> = ({
  tests,
  canApproveTestRequests,
  tableHeaders,
  onSelectionChange,
  selectedItems,
  testRequestId,
  enableSelection,
  testRequest,
}) => {
  const { t } = useTranslation();

  const [expandedItems, setExpandedItems] = useState<{
    [key: string]: boolean;
  }>({});

  return (
    <>
      <DataTable
        rows={tests}
        headers={tableHeaders}
        isSortable
        useZebraStyles
        overflowMenuOnHover={true}
        render={({
          rows,
          headers,
          getHeaderProps,
          getTableProps,
          getRowProps,
          getBatchActionProps,
          getSelectionProps,
          getToolbarProps,
          selectedRows,
          expandRow,
        }) => {
          const onExpandRow = (e: MouseEvent, rowId: string) => {
            expandedItems[rowId] = Boolean(!expandedItems[rowId]);
            expandRow(rowId);
          };

          const onAllSelectionChange = (
            evt: React.ChangeEvent<HTMLInputElement>
          ) => {
            let value = evt.target.checked;
            const newSelectedItems = { ...selectedItems };
            if (!newSelectedItems[testRequestId]) {
              newSelectedItems[testRequestId] = { tests: {}, allTests: false };
            }
            if (value) {
              newSelectedItems[testRequestId].allTests = true;
              newSelectedItems[testRequestId].tests = rows?.reduce((x, y) => {
                const entry = testRequest?.tests?.find((p) => p.uuid == y.id);
                if (entry?.orderUuid) {
                  x[entry.orderUuid] = true;
                }
                return x;
              }, {} as { [key: string]: boolean });
            } else {
              newSelectedItems[testRequestId].allTests = false;
              delete newSelectedItems[testRequestId]["tests"];
              newSelectedItems[testRequestId]["tests"] = {};
            }
            onSelectionChange(newSelectedItems);
          };

          const onTestRequestSelectionChange = (
            value: boolean,
            name: string,
            event: React.ChangeEvent<HTMLInputElement>,
            testRequestItemId: string
          ) => {
            const entry = testRequest?.tests?.find(
              (p) => p.uuid == testRequestItemId
            );
            const orderUuid = entry?.orderUuid ?? testRequestItemId;
            const newSelectedItems = { ...selectedItems };
            if (!newSelectedItems[testRequestId]) {
              newSelectedItems[testRequestId] = { tests: {}, allTests: false };
            }
            if (value) {
              newSelectedItems[testRequestId].allTests =
                Object.keys(newSelectedItems[testRequestId].tests).length + 1 ==
                tests.length;
              newSelectedItems[testRequestId].tests[orderUuid] = true;
            } else {
              newSelectedItems[testRequestId].allTests = false;
              if (newSelectedItems[testRequestId]["tests"][orderUuid]) {
                delete newSelectedItems[testRequestId]["tests"][orderUuid];
              }
            }
            onSelectionChange(newSelectedItems);
          };
          return (
            <TableContainer className={styles.tableContainer}>
              <Table
                {...getTableProps()}
                className={styles.activePatientsTable}
              >
                <TableHead>
                  <TableRow>
                    <TableExpandHeader />
                    {enableSelection && (
                      <TableSelectAll
                        {...getSelectionProps()}
                        onSelect={onAllSelectionChange}
                        checked={Boolean(
                          selectedItems[testRequestId]?.allTests
                        )}
                        indeterminate={Boolean(
                          !selectedItems[testRequestId]?.allTests &&
                            selectedItems[testRequestId]?.tests &&
                            Object.keys(selectedItems[testRequestId]?.tests)
                              .length > 0
                        )}
                      />
                    )}
                    {headers.map(
                      (header) =>
                        header.key !== "details" && (
                          <TableHeader
                            {...getHeaderProps({
                              header,
                              isSortable: header.isSortable,
                            })}
                            className={
                              isDesktop
                                ? styles.desktopHeader
                                : styles.tabletHeader
                            }
                            key={`${header.key}`}
                          >
                            {header.header?.content ?? header.header}
                          </TableHeader>
                        )
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => {
                    const entry = testRequest?.tests?.find(
                      (p) => p.uuid == row.id
                    );
                    const orderUuid = entry?.orderUuid ?? row.id;
                    return (
                      <React.Fragment key={row.id}>
                        <TableExpandRow
                          className={`${
                            isDesktop ? styles.desktopRow : styles.tabletRow
                          } ${
                            (entry?.permission?.canEditTestResults ||
                              entry?.permission?.canViewTestResults) &&
                            entry?.testResult
                              ? ""
                              : styles.noTestResultsRow
                          }`}
                          {...getRowProps({ row })}
                          key={row.id}
                          id={`tr-test-${row.id}`}
                          isExpanded={Boolean(expandedItems[row.id])}
                          onExpand={(e) => onExpandRow(e, row.id)}
                        >
                          {enableSelection && (
                            <TableSelectRow
                              {...getSelectionProps({
                                row,
                              })}
                              checked={Boolean(
                                selectedItems[testRequestId]?.tests?.[orderUuid]
                              )}
                              onChange={(v, n, e) =>
                                onTestRequestSelectionChange(v, n, e, row.id)
                              }
                              classNames={styles.selectionCheckbox}
                            />
                          )}
                          {row.cells.map(
                            (cell) =>
                              cell?.info?.header !== "details" && (
                                <TableCell key={cell.id}>
                                  {cell.value}
                                </TableCell>
                              )
                          )}
                        </TableExpandRow>
                        {(entry?.permission?.canEditTestResults ||
                          entry?.permission?.canViewTestResults) &&
                          entry?.testResult &&
                          expandedItems[row.id] && (
                            <TableExpandedRow
                              className={`${styles.tableExpandedRow} ${styles.worksheetItemTableExpandedRow}`}
                              colSpan={headers.length + 1}
                            >
                              <div className={styles.worksheetItemRowDetails}>
                                <TestResultInfo
                                  testConcept={entry?.testConcept}
                                  testResult={entry?.testResult}
                                />
                                {entry?.testResult?.approvals?.length > 0 && (
                                  <TestResultApprovalList
                                    approvals={entry?.testResult?.approvals}
                                  />
                                )}
                              </div>
                            </TableExpandedRow>
                          )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
              {(rows?.length ?? 0) === 0 ? (
                <div className={styles.tileContainer}>
                  <Tile className={styles.tile}>
                    <div className={styles.tileContent}>
                      <p className={styles.content}>
                        {t("noLaboratoryTestsToDisplay", "No tests to display")}
                      </p>
                    </div>
                  </Tile>
                </div>
              ) : null}
            </TableContainer>
          );
        }}
      ></DataTable>
    </>
  );
};

export default TestRequestReferredItemList;
