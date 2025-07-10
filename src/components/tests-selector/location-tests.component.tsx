import React from "react";
import { TestConfig } from "../../api/types/test-config";
import styles from "./location-tests.scss";
import type { Location as DiagonisticCenter } from "@openmrs/esm-framework";
import { Button, Checkbox } from "@carbon/react";
import { TrashCan } from "@carbon/react/icons";

const LocationTests = ({
  center,
  deleteTest,
  tests,
  deleteAllTests,
  showLocation,
  referOut,
  readonly = false,
  enableReferOut = false,
}: {
  showLocation: boolean;
  center: DiagonisticCenter;
  tests: Array<TestConfig>;
  deleteTest: (center: DiagonisticCenter, test: TestConfig) => void;
  deleteAllTests?: (center: DiagonisticCenter) => void;
  readonly: boolean;
  enableReferOut?: boolean;
  referOut?: (center: DiagonisticCenter, test: TestConfig) => void;
}) => {
  return (
    <div className={styles.selectedTests}>
      {showLocation && (
        <div className={styles.testLocation}>
          <h6>{center.display}</h6>
          {!readonly && deleteAllTests && (
            <Button
              kind="ghost"
              onClick={() => deleteAllTests(center)}
              renderIcon={(props) => <TrashCan size={16} {...props} />}
            />
          )}
        </div>
      )}
      {tests?.map((test, index) => (
        <div
          className={`${styles.selectedTest} ${
            tests.length % 2 == 0
              ? index % 2 == 0
                ? styles.selectedTestAltRow
                : ""
              : index % 2 == 1
              ? styles.selectedTestAltRow
              : ""
          }`}
        >
          <div className={styles.selectedTestName}>
            <span>
              {index + 1}
              {"."}&nbsp;
            </span>
            <span>
              {test?.testShortName
                ? `${test?.testShortName}${
                    test?.testName ? ` (${test.testName})` : ""
                  }`
                : test?.testName}
            </span>
          </div>
          {!readonly && (
            <div className={styles.referOut}>
              {enableReferOut && (
                <Checkbox
                  checked={test["referOut"]}
                  onChange={(e) => {
                    referOut(center, test);
                  }}
                  className={styles.testGroupItem}
                  labelText={"Refer-Out"}
                  id={`test-chk-${test.uuid}`}
                />
              )}
              <Button
                kind="ghost"
                onClick={() => deleteTest(center, test)}
                renderIcon={(props) => <TrashCan size={16} {...props} />}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default LocationTests;
