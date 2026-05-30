import { openmrsFetch, restBaseUrl } from "@openmrs/esm-framework";
import useSWR, { mutate } from "swr";
import { useCallback } from "react";

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
  let apiUrl = `${restBaseUrl}/referredorders?fulfillerStatus=${fulfillerStatus}&${customRepresentation}`;
  if (dateTo) {
    apiUrl += `&activatedOnOrAfterDate=${dateTo}`;
  }

  const { data, error, isLoading } = useSWR<
    { data: { results: Array<UgandaReferredOrderResult> } },
    Error
  >(apiUrl, openmrsFetch);

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
