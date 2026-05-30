import {
  getGlobalStore,
  openmrsFetch,
  restBaseUrl,
} from "@openmrs/esm-framework";
import dayjs from "dayjs";
import useSWR, { mutate } from "swr";
import { useEffect, useState } from "react";

export const extractErrorMessagesFromResponse = (errorObject: any) => {
  const fieldErrors = errorObject?.responseBody?.error?.fieldErrors;
  if (!fieldErrors) {
    return [errorObject?.responseBody?.error?.message ?? errorObject?.message];
  }
  return Object.values(fieldErrors).flatMap((errors: Array<Error>) =>
    errors.map((error) => error.message)
  );
};

export const getStatusColor = (fulfillerStatus: string) => {
  if (fulfillerStatus === "COMPLETED") {
    return "green";
  } else if (fulfillerStatus === "IN_PROGRESS") {
    return "orange";
  } else {
    return "red";
  }
};

export const handleMutate = (url: string) => {
  mutate((key) => typeof key === "string" && key.startsWith(url), undefined, {
    revalidate: true,
  });
};

// orders date globally
const initialState = {
  ordersDate: dayjs(new Date().setHours(0, 0, 0, 0)).format("YYYY-MM-DD"),
};

export function getStartDate() {
  return getGlobalStore<{ ordersDate: string | Date }>(
    "ordersStartDateUganda",
    initialState
  );
}

export function changeStartDate(updatedDate: string | Date) {
  const store = getStartDate();
  store.setState({
    ordersDate: dayjs(new Date(updatedDate).setHours(0, 0, 0, 0)).format(
      "YYYY-MM-DD"
    ),
  });
}

export const useOrderDate = () => {
  const [currentOrdersDate, setCurrentOrdersDate] = useState(
    initialState.ordersDate
  );

  useEffect(() => {
    getStartDate().subscribe(({ ordersDate }) =>
      setCurrentOrdersDate(ordersDate.toString())
    );
  }, []);

  return { currentOrdersDate, setCurrentOrdersDate };
};
