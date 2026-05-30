import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  type AssignedExtension,
  Extension,
  useConnectedExtensions,
  useSession,
  userHasAccess,
} from "@openmrs/esm-framework";
import { Tab, Tabs, TabList } from "@carbon/react";
import { useTranslation } from "react-i18next";
import styles from "./laboratory-queue.scss";
import { ComponentContext } from "@openmrs/esm-framework/src/internal";
import TestClearanceList from "./tests-clearance-list.component";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  URL_LAB_EXTENSION_URL,
  URL_LAB_REQUESTS_ALL,
  URL_LAB_REQUESTS_ALL_PATH,
  URL_LAB_REQUESTS_APPROVED,
  URL_LAB_REQUESTS_PENDING_APPROVAL,
  URL_LAB_REQUESTS_REFERRED_APPROVAL,
  URL_LAB_REQUESTS_REJECTED_APPROVAL,
  URL_LAB_RESULTS_APPROVAL,
  URL_LAB_SAMPLES,
  URL_LAB_SAMPLES_PATH,
  URL_LAB_WORKLIST,
  URL_LAB_WORKLIST_PATH,
} from "../config/urls";
import {
  APP_LABMANAGEMENT_SAMPLES,
  APP_LABMANAGEMENT_TESTREQUESTS,
  APP_LABMANAGEMENT_TESTRESULTS,
  APP_LABMANAGEMENT_WORKSHEETS,
} from "../config/privileges";
import WorkListHome from "../work-list/work-list-home.component";
import TestRequestRejectedList from "../reject-order/test-request-rejected-list.component";
import ReferredTabWrapper from "../referred-orders/referred-tab-wrapper.component";
import TestResultsClearanceList from "../review-list/results-clearance-list.component";
import { TestRequestItemStatusCancelled } from "../api/types/test-request-item";
import TestRequestCompleted from "../completed-list/test-request-completed.component";
import AllTestsHome from "../work-list/all-tests/all-test-home.component";
import SamplesHome from "../lab-samples/samples-home.component";

enum TabTypes {
  STARRED,
  SYSTEM,
  USER,
  ALL,
}

const labPanelSlot = "lab-panels-slot";

const LaboratoryOrdersTabs: React.FC = () => {
  const { t } = useTranslation();
  const { pathname: currentUrlPath } = useLocation();
  const tabExtensions = useConnectedExtensions(
    labPanelSlot
  ) as AssignedExtension[];
  const navigate = useNavigate();
  const userSession = useSession();
  const [canSeePendingApprovals, setCanSeePendingApprovals] = useState(false);
  const [canSeeSampleCollection, setCanSeeSampleCollection] = useState(false);
  const [canSeeWorksheets, setCanSeeWorksheets] = useState(false);
  const [canSeeTestResultApprovals, setCanSeeTestResultApprovals] =
    useState(false);

  useEffect(() => {
    setCanSeePendingApprovals(
      userSession?.user &&
        userHasAccess(APP_LABMANAGEMENT_TESTREQUESTS, userSession.user)
    );
    setCanSeeSampleCollection(
      userSession?.user &&
        userHasAccess(APP_LABMANAGEMENT_SAMPLES, userSession.user)
    );

    setCanSeeWorksheets(
      userSession?.user &&
        userHasAccess(APP_LABMANAGEMENT_WORKSHEETS, userSession.user)
    );
    setCanSeeTestResultApprovals(
      userSession?.user &&
        userHasAccess(APP_LABMANAGEMENT_TESTRESULTS, userSession.user)
    );
  }, [userSession.user]);

  const routes = useMemo(() => {
    let defaultRoutes = [
      ...(canSeePendingApprovals
        ? [
            {
              key: URL_LAB_REQUESTS_PENDING_APPROVAL.toLowerCase(),
              url: URL_LAB_REQUESTS_PENDING_APPROVAL,
              description: t("acceptLaboratoryTests", "Accept Tests"),
              disabled: false,
              element: <TestClearanceList />,
            },
          ]
        : []),
      ...(canSeeSampleCollection
        ? [
            {
              key: URL_LAB_SAMPLES.toLowerCase(),
              url: URL_LAB_SAMPLES_PATH,
              description: t("laboratorySamples", "Samples"),
              disabled: false,
              element: <SamplesHome />,
            },
          ]
        : []),
      ...(canSeeWorksheets
        ? [
            {
              key: URL_LAB_WORKLIST.toLowerCase(),
              url: URL_LAB_WORKLIST_PATH,
              description: t("worklist", "Worklist"),
              disabled: false,
              element: <WorkListHome />,
            },
          ]
        : []),
      ...(canSeeTestResultApprovals
        ? [
            {
              key: URL_LAB_RESULTS_APPROVAL.toLowerCase(),
              url: URL_LAB_RESULTS_APPROVAL,
              description: t("review", "Review"),
              disabled: false,
              element: <TestResultsClearanceList />,
            },
          ]
        : []),
      /* {
        key: URL_LAB_TESTS_ORDERED.toLowerCase(), 
        url: URL_LAB_TESTS_ORDERED,
        description: t("testedOrders", "Tests ordered"),
        disabled: true,
        element: <TestsOrderedList />,
      }, */
      ...tabExtensions
        .filter(
          (extension) =>
            Object.keys(extension.meta).length > 0 &&
            ![
              "worklist-panel-component",
              "rejected-panel-component",
              "referred-panel-component",
              "approved-panel-component",
              "review-panel-component",
            ].some((p) => p == extension.id)
        )
        .map((extension) => {
          const { name, title } = extension.meta;

          if (name && title) {
            let url = URL_LAB_EXTENSION_URL(extension.id);
            return {
              key: url.toLowerCase(),
              url: url,
              description: t(title, {
                ns: extension.moduleName,
                defaultValue: title,
              }),
              disabled: false,
              element: (
                <ComponentContext.Provider
                  //key={extension.id}
                  key={url}
                  value={{
                    featureName: "LabPanel",
                    moduleName: extension.moduleName,
                    extension: {
                      extensionId: extension.id,
                      extensionSlotName: labPanelSlot,
                      extensionSlotModuleName: extension.moduleName,
                    },
                  }}
                >
                  <Extension />
                </ComponentContext.Provider>
              ),
            };
          }
        }),
      ...(canSeePendingApprovals
        ? [
            {
              key: URL_LAB_REQUESTS_APPROVED.toLowerCase(),
              url: URL_LAB_REQUESTS_APPROVED,
              description: t("approved", "Approved"),
              disabled: false,
              element: <TestRequestCompleted key={URL_LAB_REQUESTS_APPROVED} />,
            },
          ]
        : []),
      ...(canSeePendingApprovals
        ? [
            {
              key: URL_LAB_REQUESTS_REJECTED_APPROVAL.toLowerCase(),
              url: URL_LAB_REQUESTS_REJECTED_APPROVAL,
              description: t("rejected", "Rejected"),
              disabled: false,
              element: (
                <TestRequestRejectedList
                  key={URL_LAB_REQUESTS_REJECTED_APPROVAL}
                  testRequestItemStatus={TestRequestItemStatusCancelled}
                />
              ),
            },
          ]
        : []),
      ...(canSeePendingApprovals
        ? [
            {
              key: URL_LAB_REQUESTS_REFERRED_APPROVAL.toLowerCase(),
              url: URL_LAB_REQUESTS_REFERRED_APPROVAL,
              description: t("referredTests", "Referred Tests"),
              disabled: false,
              element: <ReferredTabWrapper />,
            },
          ]
        : []),
      ...(canSeePendingApprovals
        ? [
            {
              key: URL_LAB_REQUESTS_ALL.toLowerCase(),
              url: URL_LAB_REQUESTS_ALL_PATH,
              description: t("allLaboratoryTests", "All Tests"),
              disabled: false,
              element: <AllTestsHome />,
            },
          ]
        : []),
    ];

    if (defaultRoutes.length == 0) {
      defaultRoutes = [
        {
          key: "*",
          url: "/*",
          description: t("accessDenied", "Access Denied"),
          disabled: false,
          element: <div style={{ padding: "1rem" }}></div>,
        },
      ];
    }
    return defaultRoutes;
  }, [
    canSeePendingApprovals,
    canSeeSampleCollection,
    canSeeTestResultApprovals,
    canSeeWorksheets,
    t,
    tabExtensions,
  ]);

  const getPathSelectedTabIndex = useCallback(
    (pathName: string): number => {
      let selectedTabIndex = 0;
      pathName = pathName.toLowerCase();
      selectedTabIndex = routes
        //.filter((p) => !p.disabled)
        .findIndex((p) => {
          if (!pathName.startsWith(p.key)) return false;
          let nextSlash = pathName.indexOf("/", p.key.length - 1);
          return nextSlash >= 0
            ? pathName.substring(0, nextSlash) == p.key
            : pathName == p.key;
        });
      return selectedTabIndex >= 0 ? selectedTabIndex : 0;
    },
    [routes]
  );

  const [selectedTab, setSelectedTab] = useState(
    getPathSelectedTabIndex(currentUrlPath)
  );

  const handleTabIndexChange = (index) => {
    if (index < 0 && index >= routes.length) {
      index = 0;
    }
    let route = routes[index];
    setSelectedTab(index);
    navigate(route.url);
  };

  useEffect(() => {
    setSelectedTab(getPathSelectedTabIndex(currentUrlPath));
  }, [currentUrlPath, getPathSelectedTabIndex]);

  return (
    <main className={`omrs-main-content`}>
      <section className={styles.orderTabsContainer}>
        <Tabs
          selectedIndex={selectedTab}
          onChange={({ selectedIndex }) => handleTabIndexChange(selectedIndex)}
          className={styles.tabs}
        >
          <TabList
            style={{ paddingLeft: "1rem" }}
            aria-label="Laboratory tabs"
            contained
          >
            {routes
              .filter((p) => !p.disabled)
              .map((route) => (
                <Tab key={route.key} style={{ width: "150px" }}>
                  {route.description}
                </Tab>
              ))}
            {/* <Tab style={{ width: "150px" }}>
              {t("sampleCollection", "Sample Collection")}
            </Tab> */}
            {/* <Tab style={{ width: "150px" }}>
              {t("testedOrders", "Tests ordered")}
            </Tab> */}
            {/* {tabExtensions
              .filter((extension) => Object.keys(extension.meta).length > 0)
              .map((extension, index) => {
                const { name, title } = extension.meta;

                if (name && title) {
                  return (
                    <Tab
                      key={index}
                      className={styles.tab}
                      id={`${title || index}-tab`}
                      style={{ width: "150px" }}
                    >
                      {t(title, {
                        ns: extension.moduleName,
                        defaultValue: title,
                      })}
                    </Tab>
                  );
                } else {
                  return null;
                }
              })} */}
          </TabList>
          {/*  <TabPanels>
            <TabPanel style={{ padding: 0 }}>
              {selectedTab == 0 && <TestClearanceList />}
            </TabPanel>
            <TabPanel style={{ padding: 0 }}>
              {selectedTab == 1 && <SampleCollectonList />}
            </TabPanel> */}
          {/* <TabPanel style={{ padding: 0 }}>
              <TestsOrderedList />
            </TabPanel> */}
          {/* {tabExtensions
              .filter((extension) => Object.keys(extension.meta).length > 0)
              .map((extension, index) => {
                return (
                  <TabPanel key={`${extension.meta.title}-tab-${index}`}>
                    {selectedTab == index + 2 && (
                      <ComponentContext.Provider
                        key={extension.id}
                        value={{
                          featureName: "LabPanel",
                          moduleName: extension.moduleName,
                          extension: {
                            extensionId: extension.id,
                            extensionSlotName: labPanelSlot,
                            extensionSlotModuleName: extension.moduleName,
                          },
                        }}
                      >
                        <Extension />
                      </ComponentContext.Provider>
                    )}
                  </TabPanel>
                );
              })}
          </TabPanels> */}
        </Tabs>
        <Routes>
          {routes
            .filter((p) => !p.disabled)
            .map((route) => (
              <Route path={route.url} element={route.element} />
            ))}
          <Route
            key="default-route"
            path={"*"}
            element={<Navigate to={URL_LAB_REQUESTS_PENDING_APPROVAL} />}
          />
        </Routes>
      </section>
    </main>
  );
};

export default LaboratoryOrdersTabs;
