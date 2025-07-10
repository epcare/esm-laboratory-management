import React, { useCallback, useState } from "react";
import { Button, InlineLoading } from "@carbon/react";
import { useTranslation } from "react-i18next";
import { URL_LOCATIONS_EDIT } from "../../config/urls";
import { FetchResponse, showNotification } from "@openmrs/esm-framework";
import { getLabLocation } from "../../api/location.resource";
import { ResourceRepresentation } from "../../api/resource-filter-criteria";
import { OpenMRSLocation } from "../../api/types/location";
import { PageableResult } from "../../api/types/pageable-result";
import { extractErrorMessagesFromResponse } from "../../utils/functions";
import { Edit } from "@carbon/react/icons";

interface EditDiagnosticCenterButtonProps {
  locationUuid: string;
  locationName: string;
  className?: string;
  showIconOnly?: boolean;
}

const EditDiagnosticCenterLinkButton: React.FC<
  EditDiagnosticCenterButtonProps
> = ({ locationUuid, locationName, className, showIconOnly }) => {
  const { t } = useTranslation();
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const onViewItem = useCallback(
    async (uuid: string, event: React.MouseEvent<HTMLButtonElement>) => {
      if (event) {
        event.preventDefault();
      }
      try {
        setIsLoadingLocation(true);
        const response: FetchResponse<PageableResult<OpenMRSLocation>> =
          await getLabLocation(locationUuid, {
            v: ResourceRepresentation.Full,
          });
        setIsLoadingLocation(false);
        if (response?.data) {
          window.open(
            URL_LOCATIONS_EDIT((response?.data as any)?.id),
            "_blank"
          );
        }
      } catch (error) {
        setIsLoadingLocation(false);
        showNotification({
          title: t(
            "laboratoryLoadLocationError",
            "Error loading location information"
          ),
          kind: "error",
          critical: true,
          description: error?.message,
        });
      }
    },
    [locationUuid, t]
  );

  const onViewItemClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, uuid: string) => {
      event.preventDefault();
      onViewItem(uuid, null!);
    },
    [onViewItem]
  );

  return showIconOnly ? (
    <Button
      kind="ghost"
      size="md"
      onClick={onViewItemClick}
      iconDescription={t("laboratoryDiagnosticCenterEdit", "Edit Lab Section")}
      renderIcon={(props) => <Edit size={16} {...props} />}
    ></Button>
  ) : (
    <Button
      disabled={isLoadingLocation}
      className={className}
      kind="ghost"
      size="md"
      onClick={onViewItemClick}
      iconDescription={t("laboratoryDiagnosticCenterEdit", "Edit Lab Section")}
    >
      {isLoadingLocation ? <InlineLoading /> : locationName}
    </Button>
  );
};
export default EditDiagnosticCenterLinkButton;
