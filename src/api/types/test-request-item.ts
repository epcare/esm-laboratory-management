import { Concept } from "./concept/concept";
import { RecordPermission } from "./record-permission";
import { Sample } from "./sample";
import { TestResult } from "./test-result";

export interface TestRequestItem {
  testUuid?: string;
  locationUuid?: string;
  referredOut?: boolean;
  orderId?: number;
  testName?: string;
  testShortName?: string;
  orderUuid?: string;
  orderNumber?: string;
  atLocationUuid?: string;
  atLocationName?: string;
  toLocationName?: string;
  status?: string;
  referralOutOrigin?: string;
  referralOutByUuid?: string;
  referralOutByGivenName?: string;
  referralOutByMiddleName?: string;
  referralOutByFamilyName?: string;
  referralOutDate?: Date;
  referralToFacilityUuid?: string;
  referralToFacilityName?: string;
  requireRequestApproval?: boolean;
  requestApprovalResult?: string;
  requestApprovalByUuid?: string;
  requestApprovalBy?: number;
  requestApprovalGivenName?: string;
  requestApprovalMiddleName?: string;
  requestApprovalFamilyName?: string;
  requestApprovalDate?: Date;
  requestApprovalRemarks?: string;
  initialSampleUuid?: string;
  finalResultUuid?: string;
  uuid?: string;
  encounterUuid?: string;
  referralOutSampleUuid?: string;
  completed?: boolean;
  completedDate?: Date;
  resultDate?: Date;
  testRequestUuid?: string;
  testRequestNo?: string;
  dateCreated?: Date;
  dateChanged?: Date;
  creator?: number;
  creatorUuid?: string;
  creatorGivenName?: string;
  creatorFamilyName?: string;
  changedBy?: number;
  changedByUuid?: string;
  changedByGivenName?: string;
  changedByFamilyName?: string;
  samples?: Array<Sample> | null;
  permission?: RecordPermission;
  worksheetUuid?: string;
  worksheetNo?: string;

  urgency?: string;
  patientUuid?: string;
  patientIdentifier?: string;
  patientGivenName?: string;
  patientMiddleName?: string;
  patientFamilyName?: string;
  toLocationUuid?: string;
  testRequestItemSampleUuid?: string | null | undefined;
  testResult?: TestResult;
  testConcept?: Concept;
  syncTask?: string | null;
}

export const ReferralOutOriginLab = "Laboratory";
export const ReferralOutOriginProvider = "Provider";
export const ReferralOutOrigins = [
  ReferralOutOriginLab,
  ReferralOutOriginProvider,
] as const;
export type ReferralOutOriginType = (typeof ReferralOutOrigins)[number];

export const TestRequestItemStatusReferredOutLab = "REFERRED_OUT_LAB";
export const TestRequestItemStatusReferredOutProvider = "REFERRED_OUT_PROVIDER";
export const TestRequestItemStatusRequestApproval = "REQUEST_APPROVAL";
export const TestRequestItemStatusSampleCollection = "SAMPLE_COLLECTION";
export const TestRequestItemStatusInProgress = "IN_PROGRESS";
export const TestRequestItemStatusCancelled = "CANCELLED";
export const TestRequestItemStatusCompleted = "COMPLETED";
export const TestRequestItemStatuses = [
  TestRequestItemStatusReferredOutLab,
  TestRequestItemStatusReferredOutProvider,
  TestRequestItemStatusRequestApproval,
  TestRequestItemStatusSampleCollection,
  TestRequestItemStatusInProgress,
  TestRequestItemStatusCancelled,
  TestRequestItemStatusCompleted,
] as const;
export type TestRequestStatusType = (typeof TestRequestItemStatuses)[number];

export const getDescriptiveStatus = (
  test: TestRequestItem,
  translator: (key: string) => string
) => {
  if (test?.status == TestRequestItemStatusInProgress) {
    if (test?.testResult) {
      return `${translator("RESULTED")}${
        test?.testResult.completed
          ? ` (${translator("Approved")})`
          : ` (${test.testResult.status})`
      }`;
    } else if (test?.worksheetNo) {
      return translator("ON_WORKSHEET");
    }
    return translator("PENDING_TESTING");
  }
  return translator(test?.status);
};

export const TestRequestItemMatchNoWorkStarted = "NoWorkStarted";
export const TestRequestItemMatchNoResults = "NoResults";
export const TestRequestItemMatchResults = "Results";
export const TestRequestItemMatchRejected = "Rejected";
export const TestRequestItemMatchWorksheet = "Worksheet";
export const TestRequestItemMatchWorksheetNoResults = "WorksheetNoResults";
export const TestRequestItemMatchWorksheetResults = "WorksheetResults";
export const TestRequestItemMatchNoWorksheetResults = "NoWorksheetResults";
export const TestRequestItemMatchOptions = [
  TestRequestItemMatchNoWorkStarted,
  TestRequestItemMatchNoResults,
  TestRequestItemMatchResults,
  TestRequestItemMatchRejected,
  TestRequestItemMatchWorksheet,
  TestRequestItemMatchWorksheetNoResults,
  TestRequestItemMatchWorksheetResults,
  TestRequestItemMatchNoWorksheetResults,
] as const;
export type TestRequestItemMatchOptionType =
  (typeof TestRequestItemMatchOptions)[number];

export const SyncStatusNotSynced = "NOT_SYNCED";
export const SyncStatusSyncing = "SYNCING";
export const SyncStatusSynced = "SYNCED";
export const SyncStatusFailed = "FAILED";
export const SyncStatuses = [
  SyncStatusNotSynced,
  SyncStatusSyncing,
  SyncStatusSynced,
  SyncStatusFailed,
] as const;
export type SyncStatusType = (typeof SyncStatuses)[number];

export type SyncViewType = "NOT_SYNCED" | "SYNCED";
