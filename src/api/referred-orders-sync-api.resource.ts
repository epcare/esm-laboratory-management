import { openmrsFetch, restBaseUrl } from "@openmrs/esm-framework";
import useSWR, { mutate } from "swr";
import { useCallback, useMemo } from "react";

// Types for the ugandaemr-style referred orders response
export interface UgandaReferredOrderResult {
  order: {
    uuid: string;
    orderNumber: string;
    accessionNumber?: string;
    instructions?: string;
    careSetting: { uuid: string };
    encounter: {
      uuid: string;
      obs: Array<{
        order?: {
          uuid: string;
          display: string;
          patient?: {
            uuid: string;
            display: string;
          };
        };
      }>;
    };
    specimenSource?: {
      uuid: string;
      display: string;
    };
    fulfillerComment?: string;
    orderType: { display: string };
    concept: { display: string; uuid: string };
    action: string;
    dateStopped?: string;
    fulfillerStatus: string;
    dateActivated: string;
    orderer: { uuid: string; display: string };
    urgency: string;
    patient: {
      uuid: string;
      names: Array<{ display: string }>;
      display: string;
      gender: string;
      birthdate: string;
      identifiers: Array<{
        voided: boolean;
        preferred: boolean;
        uuid: string;
        display: string;
        identifierType: { uuid: string };
      }>;
    };
  };
  syncTask: {
    status?: string;
    [key: string]: any;
  } | null;
}

/**
 * Hook to fetch referred orders using the ugandaemr API
 * @param fulfillerStatus - "IN_PROGRESS" for not synced, "RECEIVED" for synced
 * @param dateTo - Optional date filter
 */
export function useGetUgandaReferredOrders(
  fulfillerStatus: "IN_PROGRESS" | "RECEIVED",
  dateTo?: string
) {
  const customRepresentation =
    "v=custom:(order:(uuid,orderNumber,accessionNumber,instructions,specimenSource:(uuid,display),careSetting:(uuid),encounter:(uuid,obs:(order:(uuid,display,patient:(uuid,display)))),fulfillerComment,orderType:(display),concept:(display,uuid),action,dateStopped,fulfillerStatus,dateActivated,orderer:(uuid,display),urgency,patient:(uuid,names:(display),display,gender,birthdate,identifiers:(voided,preferred,uuid,display,identifierType:(uuid)))),syncTask)";

  // Build API URL with proper query parameter handling
  const apiUrl = useMemo(() => {
    let url = `${restBaseUrl}/referredorders?fulfillerStatus=${fulfillerStatus}&${customRepresentation}`;
    if (dateTo) {
      url += `&activatedOnOrAfterDate=${dateTo}`;
    }
    return url;
  }, [fulfillerStatus, dateTo, customRepresentation]);

  // Use SWR with a unique key function to ensure proper cache invalidation
  const swrKey = useMemo(
    () => ({
      url: apiUrl,
      status: fulfillerStatus, // Add status as part of the key for proper cache differentiation
    }),
    [apiUrl, fulfillerStatus]
  );

  const fetcher = useCallback(() => openmrsFetch(swrKey.url), [swrKey.url]);

  const { data, error, isLoading } = useSWR<
    { data: { results: Array<UgandaReferredOrderResult> } },
    Error
  >(swrKey, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
    dedupingInterval: 0,
    revalidateOnMount: true,
    refreshInterval: 0,
    keepPreviousData: false,
  });

  const mutateUgandaReferredOrders = useCallback(
    () =>
      mutate(
        (key) =>
          typeof key === "string" &&
          key.startsWith(`${restBaseUrl}/referredorders`)
      ),
    []
  );

  return {
    data: data?.data?.results ?? [],
    isLoading,
    isError: error,
    mutate: mutateUgandaReferredOrders,
  };
}
