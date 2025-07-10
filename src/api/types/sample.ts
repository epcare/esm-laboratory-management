import { RecordPermission } from "./record-permission";
import { TestConfig } from "./test-config";
import type { Location as DiagonisticCenter } from "@openmrs/esm-framework";
import { TestRequestItem } from "./test-request-item";

export type DiagonisticCenterTests = {
  [key: string]: { center: DiagonisticCenter; tests: Array<TestConfig> };
};

export interface Sample {
  uuid?: string | null | undefined;
  sampleTypeUuid: string | null | undefined;
  sampleTypeName?: string | null | undefined;
  atLocationUuid?: string | null | undefined;
  atLocationName?: string | null | undefined;
  containerTypeUuid?: string | null | undefined;
  containerTypeName?: string | null | undefined;
  volume?: number | null | undefined;
  volumeUnitUuid?: string | null | undefined;
  volumeUnitName?: string | null | undefined;
  collectedByUuid?: string | null | undefined;
  collectedByGivenName?: string;
  collectedByMiddleName?: string;
  collectedByFamilyName?: string;
  collectionDate?: Date | null | undefined;
  containerCount?: number | null | undefined;
  accessionNumber: string | null | undefined;
  providedRef?: string | null | undefined;
  externalRef: string | null | undefined;
  referredOut?: boolean | null | undefined;
  referralOutOrigin?: string;
  referralOutByUuid?: string;
  referralOutByGivenName?: string;
  referralOutByMiddleName?: string;
  referralOutByFamilyName?: string;
  referralOutDate?: Date;
  referralToFacilityUuid?: string;
  referralToFacilityName?: string;
  status?: SampleStatusType | null | undefined;
  storageStatus?: StorageStatusType | null | undefined;
  encounterUuid?: string | null | undefined;
  testRequestUuid?: string | null | undefined;
  testRequestItemSampleUuid?: string | null | undefined;
  dateCreated?: Date | null | undefined;
  creatorGivenName?: string | null | undefined;
  creatorFamilyName?: string | null | undefined;
  storageUnitName?: string;
  storageName?: string;
  storageUnitUuid?: string;
  storageUuid?: string;

  patientUuid?: string;
  patientIdentifier?: string;
  patientGivenName?: string;
  patientMiddleName?: string;
  patientFamilyName?: string;
  referralFromFacilityUuid?: string;
  referralFromFacilityName?: string;
  referralInExternalRef?: string;
  testRequestNo?: string;

  permission?: RecordPermission;
  tests:
    | Array<TestConfig>
    | DiagonisticCenterTests
    | Array<TestRequestItem>
    | null
    | undefined;
}

export const SampleStatusPending = "PENDING";
export const SampleStatusCollection = "COLLECTION";
export const SampleStatusTesting = "TESTING";
export const SampleStatusArchived = "ARCHIVED";
export const SampleStatusDisposed = "DISPOSED";
export const SampleStatuses = [
  SampleStatusPending,
  SampleStatusCollection,
  SampleStatusTesting,
  SampleStatusArchived,
  SampleStatusDisposed,
] as const;
export type SampleStatusType = (typeof SampleStatuses)[number];

export type SampleSelection = {
  [key: string]: boolean;
};

export const StorageStatusArchived = "ARCHIVED";
export const StorageStatusCheckedOut = "CHECKED_OUT";
export const StorageStatusDisposed = "DISPOSED";
export const StorageStatuses = [
  StorageStatusArchived,
  StorageStatusCheckedOut,
  StorageStatusDisposed,
] as const;
export type StorageStatusType = (typeof StorageStatuses)[number];
