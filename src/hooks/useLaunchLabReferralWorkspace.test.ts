import { act, renderHook } from "@testing-library/react";
import { useLaunchWorkspaceRequiringVisit } from "@openmrs/esm-patient-common-lib";
import { useLaunchLabReferralWorkspace } from "./useLaunchLabReferralWorkspace";

jest.mock("@openmrs/esm-patient-common-lib", () => ({
  useLaunchWorkspaceRequiringVisit: jest.fn(),
}));

const mockUseLaunchWorkspaceRequiringVisit =
  useLaunchWorkspaceRequiringVisit as jest.Mock;

describe("useLaunchLabReferralWorkspace", () => {
  it("opens the laboratory referral form for the current patient", () => {
    const launchWorkspace = jest.fn();
    mockUseLaunchWorkspaceRequiringVisit.mockReturnValue(launchWorkspace);

    const { result } = renderHook(() =>
      useLaunchLabReferralWorkspace("patient-uuid")
    );

    act(() => result.current());

    expect(mockUseLaunchWorkspaceRequiringVisit).toHaveBeenCalledWith(
      "patient-laboratory-referral-workspace"
    );
    expect(launchWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceTitle: "Laboratory Referral Form",
        patientUuid: "patient-uuid",
      })
    );
  });
});
