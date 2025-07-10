import { restBaseUrl, Visit } from "@openmrs/esm-framework";
import {
  ResourceFilterCriteria,
  toQueryParams,
} from "./resource-filter-criteria";
import { PageableResult } from "./types/pageable-result";
import useSWRMutation from "swr/mutation";
import useSWR, { mutate } from "swr";
import { useCallback, useEffect, useState } from "react";
import { customOpenMRSFetch } from "./custom-openmrs-fetch";

export interface VisitFilterCriteria extends ResourceFilterCriteria {
  patient: string;
  includeInactive: boolean;
}

export function useLazyVisits() {
  const [isLazy, setIsLazy] = useState(true);
  const [searchCriteria, setSearchCriteria] = useState<VisitFilterCriteria>();

  const fetcher = () => {
    let apiUrl = `${restBaseUrl}/visit${toQueryParams(searchCriteria)}`;
    return customOpenMRSFetch(apiUrl);
  };

  const { data, error, trigger, isMutating } = useSWRMutation<
    {
      data: PageableResult<Visit>;
    },
    Error
  >(`${restBaseUrl}/visit`, fetcher);

  const getVisits = useCallback((filterCriteria: VisitFilterCriteria) => {
    setSearchCriteria(filterCriteria);
    setIsLazy(false);
  }, []);

  useEffect(() => {
    if (!isLazy) {
      trigger();
    }
  }, [searchCriteria, isLazy, trigger]);

  return {
    getVisits,
    items: data?.data || <PageableResult<Visit>>{},
    isLoading: false,
    isError: error,
    isValidating: isLazy ? false : isMutating,
  };
}

export function useVisit(visitUuid: string) {
  const apiUrl = `${restBaseUrl}/visit/${visitUuid}`;
  const { data, error, isLoading } = useSWR<
    {
      data: Visit;
    },
    Error
  >(apiUrl, customOpenMRSFetch, { revalidateOnFocus: false });
  return {
    items: data?.data || <Visit>{},
    isLoading,
    isError: error,
  };
}
