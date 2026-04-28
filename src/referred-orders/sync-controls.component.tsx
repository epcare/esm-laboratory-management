import React from "react";
import { Button, ButtonSet, Toggle } from "@carbon/react";
import { useTranslation } from "react-i18next";
import styles from "./sync-controls.component.scss";

interface SyncControlsProps {
  syncView: "NOT_SYNCED" | "SYNCED";
  onToggleChange: () => void;
  selectedCount: number;
  isSyncingAll: boolean;
  isSyncingSelected: boolean;
  isRequestingAll: boolean;
  isRequestingSelected: boolean;
  onSyncAll: () => void;
  onSyncSelected: () => void;
  onRequestAll: () => void;
  onRequestSelected: () => void;
}

const SyncControls: React.FC<SyncControlsProps> = ({
  syncView,
  onToggleChange,
  selectedCount,
  isSyncingAll,
  isSyncingSelected,
  isRequestingAll,
  isRequestingSelected,
  onSyncAll,
  onSyncSelected,
  onRequestAll,
  onRequestSelected,
}) => {
  const { t } = useTranslation();

  return (
    <div className={styles.syncControlsContainer}>
      <div className={styles.toggleSection}>
        <Toggle
          id="sync-view-toggle"
          labelA={t("notSynced", "Not Synced")}
          labelB={t("synced", "Synced")}
          size="sm"
          toggled={syncView === "SYNCED"}
          onToggle={onToggleChange}
        />
      </div>

      {syncView === "NOT_SYNCED" && (
        <div className={styles.buttonSection}>
          <ButtonSet className={styles.buttonSet}>
            <Button
              size="sm"
              disabled={isSyncingAll || selectedCount === 0}
              onClick={onSyncSelected}
              kind="primary"
              className={styles.button}
            >
              {isSyncingSelected ? "…" : t("syncSelected", "Sync Selected")}
            </Button>
            <Button
              size="sm"
              kind="primary"
              disabled={isSyncingAll}
              onClick={onSyncAll}
              className={styles.button}
            >
              {isSyncingAll ? "…" : t("syncAll", "Sync All")}
            </Button>
          </ButtonSet>
        </div>
      )}

      {syncView === "SYNCED" && (
        <div className={styles.buttonSection}>
          <ButtonSet className={styles.buttonSet}>
            <Button
              size="sm"
              disabled={isRequestingAll || selectedCount === 0}
              onClick={onRequestSelected}
              kind="primary"
              className={styles.button}
            >
              {isRequestingSelected
                ? "…"
                : t("requestSelected", "Request Selected")}
            </Button>
            <Button
              size="sm"
              kind="primary"
              disabled={isRequestingAll}
              onClick={onRequestAll}
              className={styles.button}
            >
              {isRequestingAll ? "…" : t("requestAll", "Request All")}
            </Button>
          </ButtonSet>
        </div>
      )}
    </div>
  );
};

export default SyncControls;
