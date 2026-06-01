import React, { useMemo } from "react";
import { useConfig } from "@openmrs/esm-framework";
import TestRequestReferredList from "./test-request-referred-list.component";
import ReferredOrdersSync from "./referred-orders-sync.component";

/**
 * Wrapper component that determines which referral implementation to use
 * based on the global property 'labmanagement.referralViewImplementation'.
 *
 * Values:
 * - "simple" (default): Uses the UgandaEMR-style sync implementation with better tracking
 * - "advanced": Uses the original esm-laboratory-management implementation
 */
const ReferredTabWrapper: React.FC = () => {
  const config = useConfig();

  // Get the referral view implementation from config, default to 'simple'
  const referralViewImplementation = useMemo(() => {
    return (config as any)?.laboratoryReferralViewImplementation ?? "simple";
  }, [config]);

  // Render the appropriate component based on the configuration
  if (referralViewImplementation === "advanced") {
    return <TestRequestReferredList />;
  }

  // Default to simple implementation (UgandaEMR-style)
  return <ReferredOrdersSync />;
};

export default ReferredTabWrapper;
