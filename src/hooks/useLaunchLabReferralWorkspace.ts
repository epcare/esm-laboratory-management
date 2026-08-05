import { useCallback } from "react";
import { useLaunchWorkspaceRequiringVisit } from "@openmrs/esm-patient-common-lib";
import { mutate } from "swr";

const LAB_REFERRAL_WORKSPACE = "patient-laboratory-referral-workspace";

interface LabReferralWorkspaceProps {
  patientUuid: string;
  workspaceTitle: string;
  mutateForm: () => void;
}

export function useLaunchLabReferralWorkspace(patientUuid: string) {
  const launchWorkspace =
    useLaunchWorkspaceRequiringVisit<LabReferralWorkspaceProps>(
      LAB_REFERRAL_WORKSPACE
    );

  return useCallback(() => {
    launchWorkspace({
      workspaceTitle: "Laboratory Referral Form",
      patientUuid,
      mutateForm: () => {
        mutate(() => true, undefined, { revalidate: true });
      },
    });
  }, [launchWorkspace, patientUuid]);
}
