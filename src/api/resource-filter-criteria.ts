import { PagingCriteria } from "./types/pageable-result";
import dayjs from "dayjs";

export enum ResourceRepresentation {
  Default = "default",
  Full = "full",
  REF = "ref",
}

export interface ResourceFilterCriteria extends PagingCriteria {
  v?: ResourceRepresentation | null | string;
  q?: string | null;
  totalCount?: boolean | null;
  limit?: number | null;
  sort?: string;
}

const formatValueForQuery = (value: any): string => {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return dayjs(value).format("YYYY-MM-DD");
  }

  // If it's already a string, just return it as-is (don't convert)
  if (typeof value === "string") {
    return value;
  }

  return value.toString();
};

export function toQueryParams<T extends ResourceFilterCriteria>(
  filterCriteria?: T | null,
  skipEmptyString = true
): string {
  if (!filterCriteria) return "";
  const queryParams: string = Object.keys(filterCriteria)
    ?.map((key) => {
      const value = filterCriteria[key];
      const formattedValue = formatValueForQuery(value);

      // Only skip if the formatted value is explicitly empty
      if (
        formattedValue === "" ||
        formattedValue === null ||
        formattedValue === undefined
      ) {
        return null;
      }

      return (skipEmptyString &&
        (value === false || value === true ? true : value)) ||
        (!skipEmptyString &&
          (value === "" || (value === false || value === true ? true : value)))
        ? `${encodeURIComponent(key)}=${encodeURIComponent(formattedValue)}`
        : null;
    })
    .filter((o) => o != null)
    .join("&");
  return queryParams.length > 0 ? "?" + queryParams : "";
}
