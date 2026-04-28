import { useState, useEffect } from "react";
import { initialState, getLaboratoryStore } from "../store";
import dayjs from "dayjs";

export const useOrderDate = () => {
  const [currentOrdersDate, setCurrentOrdersDate] = useState(() => {
    const storeState = getLaboratoryStore().getState();
    let initialDate = storeState?.ordersDate ?? initialState?.ordersDate;

    // Ensure we have a valid date string in YYYY-MM-DD format
    if (initialDate && typeof initialDate === "string") {
      // Validate it's a proper date string
      if (/^\d{4}-\d{2}-\d{2}$/.test(initialDate) && dayjs(initialDate).isValid()) {
        return initialDate;
      }
    }

    // Fallback to initial state if store value is invalid
    const fallbackDate = initialState?.ordersDate;
    if (fallbackDate && typeof fallbackDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fallbackDate)) {
      return fallbackDate;
    }

    // Ultimate fallback: 7 days ago
    return dayjs(new Date().setHours(0, 0, 0, 0) - 7 * 86400000).format("YYYY-MM-DD");
  });

  useEffect(() => {
    const unsubscribe = getLaboratoryStore().subscribe(({ ordersDate }) => {
      if (
        ordersDate &&
        typeof ordersDate === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(ordersDate)
      ) {
        setCurrentOrdersDate(ordersDate);
      }
    });
    return unsubscribe;
  }, []);

  return { currentOrdersDate, setCurrentOrdersDate };
};
