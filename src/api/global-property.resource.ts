import { restBaseUrl } from "@openmrs/esm-framework";
import {
  ResourceFilterCriteria,
  toQueryParams,
} from "./resource-filter-criteria";
import { PageableResult } from "./types/pageable-result";
import useSWRMutation from "swr/mutation";
import useSWR, { mutate } from "swr";
import { useCallback, useEffect, useState } from "react";
import { GlobalProperty } from "./types/global-property";
import { customOpenMRSFetch } from "./custom-openmrs-fetch";

export interface GlobalPropertyFilterCriteria extends ResourceFilterCriteria {}

export function useGlobalProperties(filter: GlobalPropertyFilterCriteria) {
  const [searchCriteria, setSearchCriteria] = useState(filter);
  const setGlobalProperties = (filterCriteria) => {
    setSearchCriteria(filterCriteria);
  };

  const apiUrl = `${restBaseUrl}/systemsetting${toQueryParams(searchCriteria)}`;
  const { data, error, isLoading, isValidating } = useSWR<
    {
      data: PageableResult<GlobalProperty>;
    },
    Error
  >(apiUrl, customOpenMRSFetch, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
  });

  return {
    setGlobalProperties,
    items: data?.data || <PageableResult<GlobalProperty>>{},
    isLoading: isLoading,
    isError: error,
    isValidating,
  };
}

export function useLazyGlobalProperties() {
  const [isLazy, setIsLazy] = useState(true);
  const [searchCriteria, setSearchCriteria] =
    useState<GlobalPropertyFilterCriteria>();

  const fetcher = () => {
    let apiUrl = `${restBaseUrl}/systemsetting${toQueryParams(searchCriteria)}`;
    return customOpenMRSFetch(apiUrl);
  };

  const { data, error, trigger, isMutating } = useSWRMutation<
    {
      data: PageableResult<GlobalProperty>;
    },
    Error
  >(`${restBaseUrl}/systemsetting`, fetcher);

  const getGlobalProperties = useCallback((filterCriteria) => {
    setSearchCriteria(filterCriteria);
    setIsLazy(false);
  }, []);

  useEffect(() => {
    if (!isLazy) {
      trigger();
    }
  }, [searchCriteria, isLazy, trigger]);

  return {
    getGlobalProperties,
    items: data?.data || <PageableResult<GlobalProperty>>{},
    isLoading: false,
    isError: error,
    isValidating: isLazy ? false : isMutating,
  };
}

export function useGlobalProperty(globalPropertyUuid: string) {
  const apiUrl = `${restBaseUrl}/systemsetting/${globalPropertyUuid}`;
  const { data, error, isLoading } = useSWR<
    {
      data: GlobalProperty;
    },
    Error
  >(apiUrl, customOpenMRSFetch, { revalidateOnFocus: false });
  return {
    items: data?.data || <GlobalProperty>{},
    isLoading,
    isError: error,
  };
}

export function useLazyGlobalProperty() {
  const [isLazy, setIsLazy] = useState(true);
  const [globalPropertyUuid, setGlobalPropertyUuid] = useState<string>();
  const fetcher = () => {
    let apiUrl = `${restBaseUrl}/systemsetting/${globalPropertyUuid}`;
    return customOpenMRSFetch(apiUrl);
  };

  const { data, error, trigger, isMutating } = useSWRMutation<
    {
      data: GlobalProperty;
    },
    Error
  >(`${restBaseUrl}/systemsetting/${globalPropertyUuid}`, fetcher);

  const getGlobalProperty = useCallback((uuid: string) => {
    setIsLazy(false);
    setGlobalPropertyUuid(uuid);
  }, []);

  useEffect(() => {
    if (!isLazy) {
      trigger();
    }
  }, [globalPropertyUuid, isLazy, trigger]);

  return {
    getGlobalProperty,
    items: data?.data || <GlobalProperty>{},
    isLoading: false,
    isError: error,
    isValidating: isLazy ? false : isMutating,
  };
}

/**
 * Fetches a global property by its property name/key (not UUID)
 * @param propertyName - The global property name (e.g., "labmanagement.referralViewImplementation")
 * @returns The value of the global property, loading state, and error
 */
export function useGlobalPropertyByName(
  propertyName: string
): { value: string | null; isLoading: boolean; error: Error | null } {
  const apiUrl = `${restBaseUrl}/systemsetting?q=${propertyName}`;
  const { data, error, isLoading } = useSWR<
    {
      data: PageableResult<GlobalProperty>;
    },
    Error
  >(
    propertyName ? apiUrl : null,
    customOpenMRSFetch,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  // Find the matching property (OpenMRS returns partial matches, so we need exact match)
  const matchingProperty = data?.data?.results?.find(
    (gp) => gp.property === propertyName
  );

  return {
    value: matchingProperty?.value ?? null,
    isLoading,
    error: error ?? null,
  };
}
