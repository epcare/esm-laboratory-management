import React, { useState, useEffect, useMemo } from "react";
import TestRequestReferredList from "./test-request-referred-list.component";
import ReferredOrdersSync from "./referred-orders-sync.component";
import { useGlobalPropertyByName } from "../api/global-property.resource";
import { InlineLoading, Toggle } from "@carbon/react";

const STORAGE_KEY = "labmanagement.referralViewPreference";

type ViewMode = "simple" | "advanced";

/**
 * Wrapper component that determines which referral implementation to use
 * based on the global property 'labmanagement.referralViewImplementation' as default,
 * with an option to switch views on the fly using a UI toggle.
 *
 * Values:
 * - "simple" (default): Uses the UgandaEMR-style sync implementation with better tracking
 * - "advanced": Uses the original esm-laboratory-management implementation
 */
const ReferredTabWrapper: React.FC = () => {
  // Get the referral view implementation from global property as default
  const { value: globalPropertyValue, isLoading: isLoadingGlobal } =
    useGlobalPropertyByName("labmanagement.referralViewImplementation");

  // Local state for user's preferred view (overrides global property)
  const [userPreference, setUserPreference] = useState<ViewMode | null>(null);

  // Load user preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (stored === "simple" || stored === "advanced")) {
      setUserPreference(stored as ViewMode);
    }
  }, []);

  // Determine which view to show: user preference takes precedence, then global property, then default
  const currentView = useMemo(() => {
    if (userPreference) {
      return userPreference;
    }
    return globalPropertyValue === "advanced" ? "advanced" : "simple";
  }, [userPreference, globalPropertyValue]);

  // Handle view toggle
  const handleToggle = () => {
    const newView = currentView === "advanced" ? "simple" : "advanced";
    setUserPreference(newView);
    localStorage.setItem(STORAGE_KEY, newView);
  };

  // Show loading state while fetching global property
  if (isLoadingGlobal && !userPreference) {
    return <InlineLoading />;
  }

  return (
    <div>
      {/* View toggle switch */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          marginBottom: "1rem",
          marginRight: "7%",
        }}
      >
        <Toggle
          id="referral-view-toggle"
          labelA="Simple View"
          labelB="Advanced View"
          size="sm"
          toggled={currentView === "advanced"}
          onToggle={handleToggle}
        />
      </div>

      {/* Render the appropriate component based on current view */}
      {currentView === "advanced" ? (
        <TestRequestReferredList />
      ) : (
        <ReferredOrdersSync />
      )}
    </div>
  );
};

export default ReferredTabWrapper;
