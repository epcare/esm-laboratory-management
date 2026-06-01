import React from "react";
import { ConfigurableLink } from "@openmrs/esm-framework";
import { MODULE_BASE_URL } from "../config/urls";

export interface DashboardLinkConfig {
  name: string;
  title: string;
  slot?: string;
}

function DashboardExtension({
  dashboardLinkConfig,
}: {
  dashboardLinkConfig: DashboardLinkConfig;
}) {
  const { name, title } = dashboardLinkConfig;

  return (
    <ConfigurableLink to={MODULE_BASE_URL} className={`cds--side-nav__link`}>
      {title}
    </ConfigurableLink>
  );
}

export const createHomeDashboardLink =
  (dashboardLinkConfig: DashboardLinkConfig) => () =>
    <DashboardExtension dashboardLinkConfig={dashboardLinkConfig} />;
