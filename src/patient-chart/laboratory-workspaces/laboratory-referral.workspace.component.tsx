import React from "react";

import { DefaultWorkspaceProps } from "@openmrs/esm-framework";
import LabRequest from "../../lab-request/lab-request.component";

type LaboratoryWorkspaceProps = DefaultWorkspaceProps & {
  patientUuid: string;
};
export const LaboratoryWorkspace: React.FC<LaboratoryWorkspaceProps> = ({
  closeWorkspace,
  promptBeforeClosing,
  patientUuid,
}) => {
  return (
    <LabRequest
      mode="patient"
      patientUuid={patientUuid}
      closeWorkspace={closeWorkspace}
      promptBeforeClosing={promptBeforeClosing}
    />
  );
};

export default LaboratoryWorkspace;
