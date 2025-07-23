import {
  FetchResponse,
  LoggedInUser,
  showNotification,
} from "@openmrs/esm-framework";
import { extractErrorMessagesFromResponse } from "../utils/functions";
import { PrintTestRequest } from "./templates/test-request";
import { Config } from "../config-schema";
import { ResourceRepresentation } from "../api/resource-filter-criteria";
import { PageableResult } from "../api/types/pageable-result";
import { TestRequest } from "../api/types/test-request";
import { getTestRequests } from "../api/test-request.resource";
import { Patient } from "../types";
import { getPatient } from "../api/patient.resource";
import { PrintTestResult } from "./templates/test-result";

export const printTransaction = async (
  action: "Request" | "Results" | "CompletedResults",
  testRequestUuid: string,
  isPrintingCallback: (isPrinting: boolean) => void,
  laboratoryConfig: Config,
  translator: (key: string, defaultValue?: string) => string,
  currentUser: LoggedInUser,
  testRequestItemUuid?: string
) => {
  if (!testRequestUuid) return;
  try {
    isPrintingCallback(true);

    const fetchResults = action == "CompletedResults" || action == "Results";
    const response: FetchResponse<PageableResult<TestRequest>> =
      await getTestRequests({
        v: ResourceRepresentation.Full,
        testRequest: testRequestUuid,
        allTests: true,
        includeTestItemSamples: true,
        samples: true,
        includeTestItemTestResult: fetchResults,
        testResultApprovals: fetchResults,
      });
    if (!response?.data || (response?.data?.results?.length ?? 0) == 0) {
      showNotification({
        title: translator("laboratoryPrintError", "Error Printing"),
        kind: "error",
        critical: true,
        description: translator(
          "laboratoryPrintTestNotFound",
          "Test not found"
        ),
      });
      return;
    }
    let data = response.data.results[0];
    if (fetchResults) {
      if (action == "CompletedResults") {
        data.tests?.forEach((test) => {
          test.testResult = test.testResult?.completed ? test.testResult : null;
        });
        data.tests = data.tests?.filter((p) => p.testResult) ?? [];
        if (data.tests.length == 0) {
          showNotification({
            title: translator("laboratoryPrintError", "Error Printing"),
            kind: "error",
            critical: true,
            description: translator(
              "laboratoryPrintNoCompletedTestResults",
              "No completed test results"
            ),
          });
          return;
        }
      } else {
        data.tests = data.tests?.filter((p) => p.testResult) ?? [];
        if (data.tests.length == 0) {
          showNotification({
            title: translator("laboratoryPrintError", "Error Printing"),
            kind: "error",
            critical: true,
            description: translator(
              "laboratoryPrintNoTestResults",
              "No test results"
            ),
          });
          return;
        }
      }
    }

    if (testRequestItemUuid) {
      data.tests =
        data.tests?.filter((p) => p.uuid == testRequestItemUuid) ?? [];
      if (data.tests.length == 0) {
        showNotification({
          title: translator("laboratoryPrintError", "Error Printing"),
          kind: "error",
          critical: true,
          description: translator(
            "laboratoryPrintTestReuqestNotFound",
            "Test request not found"
          ),
        });
        return;
      }
    }
    let patient: Patient = null;
    if (!data?.referredIn && data?.patientUuid) {
      const response: FetchResponse<Patient> = await getPatient(
        data?.patientUuid,
        null
      );
      if (!response.data) {
        showNotification({
          title: translator("laboratoryPrintError", "Error Printing"),
          kind: "error",
          critical: true,
          description: translator(
            "laboratoryPrintPatientNotFound",
            "Patient information not found"
          ),
        });
        return;
      }
      patient = response.data;
    }

    if (action == "Request") {
      await PrintTestRequest(
        laboratoryConfig,
        patient,
        data,
        null,
        currentUser,
        translator
      );
    } else if (action == "CompletedResults" || action == "Results") {
      await PrintTestResult(
        laboratoryConfig,
        patient,
        data,
        null,
        currentUser,
        translator
      );
    }
  } catch (error) {
    isPrintingCallback(false);
    showNotification({
      title: translator("laboratoryPrintError", "Error Printing"),
      kind: "error",
      critical: true,
      description: error?.message,
    });
  } finally {
    isPrintingCallback(false);
  }
};
