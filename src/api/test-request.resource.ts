import { usePagination } from "@openmrs/esm-framework";
import {
  URL_API_TEST_REQUEST,
  URL_API_TEST_REQUEST_ACTION,
} from "../config/urls";
import {
  ResourceFilterCriteria,
  ResourceRepresentation,
  toQueryParams,
} from "./resource-filter-criteria";
import { PageableResult } from "./types/pageable-result";
import useSWR from "swr";
import { TestRequest } from "./types/test-request";
import { useCallback, useEffect, useState } from "react";
import useSWRMutation from "swr/mutation";
import { customOpenMRSFetch } from "./custom-openmrs-fetch";

export interface TestRequestFilter extends ResourceFilterCriteria {
  itemLocation?: string;
  itemStatus?: string;
  testConcept?: string;
  testConceptTests?: boolean;
  minActivatedDate?: Date | string;
  maxActivatedDate?: Date | string;
  referredIn?: boolean;
  referredOut?: boolean;
  patient?: string;
  allTests?: boolean;
  testRequest?: string;
  samples?: boolean;
  includeTestItemSamples?: boolean;
  testItemSampleCriteria?: "OR" | "AND";
  sampleStatus?: string;
  includeTestItemTestResult?: boolean;
  testResultApprovals?: boolean;
  pendingResultApproval?: boolean;
  approvals?: boolean;
  approvalsOnly?: boolean;
  approvalPerm?: boolean;
  includeItemConcept?: boolean;
  worksheetInfo?: boolean;
  itemMatch?: string;
  syncStatus?: "NOT_SYNCED" | "SYNCED" | null;
}

export function getTestRequests(filter: TestRequestFilter) {
  const apiUrl = `${URL_API_TEST_REQUEST}${toQueryParams(filter)}`;
  const abortController = new AbortController();
  return customOpenMRSFetch(apiUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    signal: abortController.signal,
  });
}

// createTestRequest
export function createTestRequest(item: any) {
  const apiUrl = URL_API_TEST_REQUEST;
  const abortController = new AbortController();
  return customOpenMRSFetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    signal: abortController.signal,
    body: item,
  });
}

export function useTestRequests(filter: TestRequestFilter) {
  const apiUrl = `${URL_API_TEST_REQUEST}${toQueryParams(filter)}`;
  const { data, error, isLoading, isValidating } = useSWR<
    {
      data: PageableResult<TestRequest>;
    },
    Error
  >(apiUrl, customOpenMRSFetch);

  return {
    items: data?.data || <PageableResult<TestRequest>>{},
    isLoading,
    isError: error,
    isValidating,
  };
}

export function useLazyTestRequestResource(defaultFilters?: TestRequestFilter) {
  const [isLazy, setIsLazy] = useState(true);

  const pageSizes = [10, 20, 30, 40, 50];
  const [currentPage, setCurrentPage] = useState(
    (defaultFilters?.startIndex ?? 0) + 1
  );
  const [currentPageSize, setPageSize] = useState(defaultFilters?.limit ?? 10);
  const [searchString, setSearchString] = useState(defaultFilters?.q);
  const [itemLocation, setItemLocation] = useState(
    defaultFilters?.itemLocation
  );
  const [testConcept, setTestConcept] = useState(defaultFilters?.testConcept);
  const [minActivatedDate, setMinActivatedDate] = useState(
    defaultFilters?.minActivatedDate
  );
  const [maxActivatedDate, setMaxActivatedDate] = useState(
    defaultFilters?.maxActivatedDate
  );
  const [allTests, setAllTests] = useState<boolean>(defaultFilters?.allTests);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [testItemStatuses, setTestItemStatuses] = useState<string>(
    defaultFilters?.itemStatus
  );
  const [samples, setSamples] = useState<boolean>(defaultFilters?.samples);
  const [includeTestItemSamples, setIncludeTestItemSamples] = useState<boolean>(
    defaultFilters?.includeTestItemSamples
  );

  const [includeTestItemTestResult, setIncludeTestItemTestResult] =
    useState<boolean>(defaultFilters?.includeTestItemTestResult);
  const [testResultApprovals, setTestResultApprovals] = useState<boolean>(
    defaultFilters?.testResultApprovals
  );
  const [includeItemConcept, setIncludeItemConcept] = useState<boolean>(
    defaultFilters?.includeItemConcept
  );
  const [worksheetInfo, setWorksheetInfo] = useState<boolean>(
    defaultFilters?.worksheetInfo
  );
  const [itemMatch, setItemMatch] = useState<string>(defaultFilters?.itemMatch);
  const [syncStatus, setSyncStatus] = useState<"NOT_SYNCED" | "SYNCED" | null>(
    defaultFilters?.syncStatus
  );

  const [testRequestFilter, setTestRequestFilter] = useState<TestRequestFilter>(
    () => {
      return {
        ...{
          startIndex: currentPage - 1,
          v: ResourceRepresentation.Default,
          limit: 10,
          q: defaultFilters?.q,
          totalCount: defaultFilters?.totalCount ?? true,
          sort: "-id",
        },
        ...(defaultFilters ?? <TestRequestFilter>{}),
      };
    }
  );

  const getTestRequests = useCallback((filterCriteria) => {
    setTestRequestFilter(filterCriteria);
    setIsLazy(false);
  }, []);

  const fetcher = () => {
    let apiUrl = `${URL_API_TEST_REQUEST}${toQueryParams(testRequestFilter)}`;
    return customOpenMRSFetch(apiUrl);
  };

  const {
    data: items,
    error,
    trigger,
    isMutating,
  } = useSWRMutation<
    {
      data: PageableResult<TestRequest>;
    },
    Error
  >(`${URL_API_TEST_REQUEST}`, fetcher);

  const pagination = usePagination(items?.data?.results ?? [], currentPageSize);

  useEffect(() => {
    setTestRequestFilter((e) => {
      return {
        ...e,
        ...{
          startIndex: currentPage - 1,
          limit: currentPageSize,
          q: searchString,
          totalCount: e.totalCount,
          v: e.v,
          minActivatedDate: minActivatedDate,
          maxActivatedDate: maxActivatedDate,
          itemLocation: itemLocation,
          testConcept: testConcept,
          allTests: allTests,
          itemStatus: testItemStatuses,
          samples: samples,
          includeTestItemSamples: includeTestItemSamples,
          includeTestItemTestResult: includeTestItemTestResult,
          testResultApprovals: testResultApprovals,
          includeItemConcept: includeItemConcept,
          worksheetInfo: worksheetInfo,
          itemMatch: itemMatch,
          syncStatus: syncStatus,
        },
      };
    });
  }, [
    searchString,
    currentPage,
    currentPageSize,
    minActivatedDate,
    maxActivatedDate,
    itemLocation,
    testConcept,
    allTests,
    testItemStatuses,
    samples,
    includeTestItemSamples,
    includeTestItemTestResult,
    testResultApprovals,
    includeItemConcept,
    worksheetInfo,
    itemMatch,
    syncStatus,
  ]);

  useEffect(() => {
    if (!loaded && isMutating) {
      setLoaded(true);
    }
  }, [isMutating, loaded]);

  useEffect(() => {
    if (!isLazy) {
      trigger();
    }
  }, [testRequestFilter, isLazy, trigger]);

  return {
    getTestRequests,
    items: pagination.results,
    pagination,
    totalCount: items?.data?.totalCount ?? 0,
    currentPageSize,
    currentPage,
    setCurrentPage,
    setPageSize,
    pageSizes,
    isLoading: false,
    isValidating: isLazy ? false : isMutating,
    isError: error,
    setSearchString,
    loaded,
    minActivatedDate,
    maxActivatedDate,
    setMinActivatedDate,
    setMaxActivatedDate,
    itemLocation,
    setItemLocation,
    testConcept,
    setTestConcept,
    allTests,
    setAllTests,
    testItemStatuses,
    setTestItemStatuses,
    testRequestFilter,
    setTestRequestFilter,
    samples,
    setSamples,
    includeTestItemSamples,
    setIncludeTestItemSamples,
    includeTestItemTestResult,
    setIncludeTestItemTestResult,
    testResultApprovals,
    setTestResultApprovals,
    includeItemConcept,
    setIncludeItemConcept,
    worksheetInfo,
    setWorksheetInfo,
    isLazy,
    setItemMatch,
    itemMatch,
    syncStatus,
    setSyncStatus,
  };
}

export function useTestRequestResource(defaultFilters?: TestRequestFilter) {
  const pageSizes = [10, 20, 30, 40, 50];
  const [currentPage, setCurrentPage] = useState(
    (defaultFilters?.startIndex ?? 0) + 1
  );
  const [currentPageSize, setPageSize] = useState(defaultFilters?.limit ?? 10);
  const [searchString, setSearchString] = useState(defaultFilters?.q);
  const [itemLocation, setItemLocation] = useState(
    defaultFilters?.itemLocation
  );
  const [testConcept, setTestConcept] = useState(defaultFilters?.testConcept);
  const [minActivatedDate, setMinActivatedDate] = useState(
    defaultFilters?.minActivatedDate
  );
  const [maxActivatedDate, setMaxActivatedDate] = useState(
    defaultFilters?.maxActivatedDate
  );
  const [allTests, setAllTests] = useState<boolean>(defaultFilters?.allTests);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [testItemStatuses, setTestItemStatuses] = useState<string>(
    defaultFilters?.itemStatus
  );
  const [samples, setSamples] = useState<boolean>(defaultFilters?.samples);
  const [includeTestItemSamples, setIncludeTestItemSamples] = useState<boolean>(
    defaultFilters?.includeTestItemSamples
  );

  const [includeTestItemTestResult, setIncludeTestItemTestResult] =
    useState<boolean>(defaultFilters?.includeTestItemTestResult);
  const [testResultApprovals, setTestResultApprovals] = useState<boolean>(
    defaultFilters?.testResultApprovals
  );
  const [includeItemConcept, setIncludeItemConcept] = useState<boolean>(
    defaultFilters?.includeItemConcept
  );
  const [worksheetInfo, setWorksheetInfo] = useState<boolean>(
    defaultFilters?.worksheetInfo
  );

  const [itemMatch, setItemMatch] = useState<string>(defaultFilters?.itemMatch);
  const [syncStatus, setSyncStatus] = useState<"NOT_SYNCED" | "SYNCED" | null>(
    defaultFilters?.syncStatus
  );

  const [testRequestFilter, setTestRequestFilter] = useState<TestRequestFilter>(
    () => {
      return {
        ...{
          startIndex: currentPage - 1,
          v: ResourceRepresentation.Default,
          limit: 10,
          q: defaultFilters?.q,
          totalCount: defaultFilters?.totalCount ?? true,
          sort: "-id",
        },
        ...(defaultFilters ?? <TestRequestFilter>{}),
      };
    }
  );

  const { items, isLoading, isError, isValidating } =
    useTestRequests(testRequestFilter);
  const pagination = usePagination(items.results, currentPageSize);

  useEffect(() => {
    setTestRequestFilter((e) => {
      return {
        ...e,
        ...{
          startIndex: currentPage - 1,
          limit: currentPageSize,
          q: searchString,
          totalCount: e.totalCount,
          v: e.v,
          minActivatedDate: minActivatedDate,
          maxActivatedDate: maxActivatedDate,
          itemLocation: itemLocation,
          testConcept: testConcept,
          allTests: allTests,
          itemStatus: testItemStatuses,
          samples: samples,
          includeTestItemSamples: includeTestItemSamples,
          includeTestItemTestResult: includeTestItemTestResult,
          testResultApprovals: testResultApprovals,
          includeItemConcept: includeItemConcept,
          worksheetInfo: worksheetInfo,
          itemMatch: itemMatch,
          syncStatus: syncStatus,
        },
      };
    });
  }, [
    searchString,
    currentPage,
    currentPageSize,
    minActivatedDate,
    maxActivatedDate,
    itemLocation,
    testConcept,
    allTests,
    testItemStatuses,
    samples,
    includeTestItemSamples,
    includeTestItemTestResult,
    testResultApprovals,
    includeItemConcept,
    worksheetInfo,
    itemMatch,
    syncStatus,
  ]);

  useEffect(() => {
    if (!loaded && isLoading) {
      setLoaded(true);
    }
  }, [isLoading, loaded]);

  return {
    items: pagination.results,
    pagination,
    totalCount: items.totalCount,
    currentPageSize,
    currentPage,
    setCurrentPage,
    setPageSize,
    pageSizes,
    isLoading,
    isValidating,
    isError,
    setSearchString,
    loaded,
    minActivatedDate,
    maxActivatedDate,
    setMinActivatedDate,
    setMaxActivatedDate,
    itemLocation,
    setItemLocation,
    testConcept,
    setTestConcept,
    allTests,
    setAllTests,
    testItemStatuses,
    setTestItemStatuses,
    testRequestFilter,
    setTestRequestFilter,
    samples,
    setSamples,
    includeTestItemSamples,
    setIncludeTestItemSamples,
    includeTestItemTestResult,
    setIncludeTestItemTestResult,
    testResultApprovals,
    setTestResultApprovals,
    includeItemConcept,
    setIncludeItemConcept,
    worksheetInfo,
    setWorksheetInfo,
    itemMatch,
    setItemMatch,
    syncStatus,
    setSyncStatus,
  };
}

export type TestRequestSelection = {
  [key: string]: { tests: { [key: string]: boolean }; allTests: boolean };
};

export function applyTestRequestAction(item: any) {
  const apiUrl = URL_API_TEST_REQUEST_ACTION;
  const abortController = new AbortController();
  return customOpenMRSFetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    signal: abortController.signal,
    body: item,
  });
}
