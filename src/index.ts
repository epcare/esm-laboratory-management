import { defineConfigSchema, getSyncLifecycle } from "@openmrs/esm-framework";
import { configSchema } from "./config-schema";
import { createHomeDashboardLink } from "./components/create-dashboard-link.component";
import rootComponent from "./root.component";
import laboratoryReferralWorkspaceComponent from "./patient-chart/laboratory-workspaces/laboratory-referral.workspace.component";
import laboratory from "./laboratory.component";
import laboratoryOrder from "./patient-chart/patient-laboratory-order-results.component";
import sendEmail from "./patient-chart/results-summary/send-email-dialog.component";
import pickLabRequestButtonComponent from "./tests-ordered/pick-lab-request-menu.component";
import worklistTile from "./lab-tiles/worklist-tile.component";
import referredTile from "./lab-tiles/referred-tile.component";
import completedTile from "./lab-tiles/completed-tile.component";
import testsOrdered from "./lab-tiles/tests-ordered-tile.component";
import rejectedTile from "./lab-tiles/rejected-tile.component";
import LabRequestTestSelectDialogComponent from "./lab-request/lab-request-test-selection-dialog.component";
import ApproveTestRequestDialogComponent from "./tests-ordered/lab-dialogs/approve-test-request-dialog.component";
import RegisterSampleDialog from "./tests-ordered/lab-dialogs/register-sample-dialog.component";
import UseExistingSampleDialog from "./tests-ordered/lab-dialogs/use-existing-sample-dialog.component";
import ImportTestResultsDialog from "./work-list/import-results/import-test-results-dialog.component";

import { createDashboardLink } from "@openmrs/esm-patient-common-lib";
import { registerWorkspace } from "@openmrs/esm-extensions";

const moduleName = "@epcare/esm-laboratory-app";

const options = {
  featureName: "epcare-esm-laboratory",
  moduleName,
};

export const importTranslation = require.context(
  "../translations",
  false,
  /.json$/,
  "lazy"
);

export const root = getSyncLifecycle(rootComponent, options);

export const laboratoryDashboardLink = getSyncLifecycle(
  createHomeDashboardLink({
    name: "laboratory",
    slot: "laboratory-dashboard-slot",
    title: "Laboratory",
  }),
  options
);

export const laboratoryComponent = getSyncLifecycle(laboratory, options);

// Patient chart
export const laboratoryOrderDashboardLink = getSyncLifecycle(
  createDashboardLink({
    path: "laboratory-orders",
    title: "Investigative Results",
    icon: "",
    moduleName,
  }),
  options
);
export const laboratoryOrderComponent = getSyncLifecycle(
  laboratoryOrder,
  options
);

export const sendEmailDialog = getSyncLifecycle(sendEmail, options);

export const pickLabRequestButton = getSyncLifecycle(
  pickLabRequestButtonComponent,
  options
);

export const worklistTileComponent = getSyncLifecycle(worklistTile, options);

export const referredTileComponent = getSyncLifecycle(referredTile, options);

export const completedTileComponent = getSyncLifecycle(completedTile, options);

export const testOrderedTileComponent = getSyncLifecycle(testsOrdered, options);

export const rejectedTileComponent = getSyncLifecycle(rejectedTile, options);

export const labRequestTestSelectDialogComponent = getSyncLifecycle(
  LabRequestTestSelectDialogComponent,
  options
);

export const approveTestRequestDialog = getSyncLifecycle(
  ApproveTestRequestDialogComponent,
  options
);

export const registerSampleDialog = getSyncLifecycle(
  RegisterSampleDialog,
  options
);

export const useExistingSampleDialog = getSyncLifecycle(
  UseExistingSampleDialog,
  options
);

export const importTestResultsDialog = getSyncLifecycle(
  ImportTestResultsDialog,
  options
);

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
  registerWorkspace({
    name: "patient-laboratory-referral-workspace",
    title: "Laboratory Referral Form",
    load: getSyncLifecycle(laboratoryReferralWorkspaceComponent, options),
    moduleName,
  });
}
