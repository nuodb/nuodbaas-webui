// (C) Copyright 2025-2026 Dassault Systemes SE.  All Rights Reserved.

import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import { MenuItemProps, PageProps } from "../../utils/types";
import PageLayout from "./parts/PageLayout";
import { withTranslation } from "react-i18next";
import Typography from "@mui/material/Typography";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import { styled } from "@mui/material";
import { t } from "i18next";
import { Tab, Tabs } from "../controls/Tabs";
import SqlLogin from "./sql/SqlLogin";
import SqlBrowseTab from "./sql/SqlBrowseTab";
import Toast from "../controls/Toast";
import SqlQueryTab from "./sql/SqlQueryTab";
import SqlSocket, { SqlType } from "../../utils/SqlSocket";
import ComboBox from "../controls/ComboBox";
import SqlImportTab from "./sql/SqlImportTab";
import SqlExportTab from "./sql/SqlExportTab";
import { BackgroundTaskType } from "../../utils/BackgroundTasks";
import Auth from "../../utils/auth";
import SqlUsersTab from "./sql/SqlUsersTab";
import Menu from "../controls/Menu";
import ArrowDropDown from "@mui/icons-material/ArrowDropDown";
import LogoutIcon from "@mui/icons-material/Logout";

interface SqlTabsProps {
  tasks: BackgroundTaskType[];
  setTasks: React.Dispatch<React.SetStateAction<BackgroundTaskType[]>>;
  dbTable: string;
  sqlConnection: SqlType | undefined;
}

function SqlTabs({ dbTable, sqlConnection, tasks, setTasks }: SqlTabsProps) {
  const [tabIndex, setTabIndex] = useState<number>(0);

  if (!sqlConnection) {
    return null;
  }

  const tabs = [];
  if (dbTable) {
    tabs.push(
      <Tab id="browse" label={t("form.sqleditor.label.tab.browse")}>
        {tabIndex === tabs.length && (
          <SqlBrowseTab sqlConnection={sqlConnection} table={dbTable} />
        )}
      </Tab>,
    );
  }
  tabs.push(
    <Tab id="query" label={t("form.sqleditor.label.tab.query")}>
      {tabIndex === tabs.length && (
        <SqlQueryTab sqlConnection={sqlConnection} dbTable={dbTable} />
      )}
    </Tab>,
  );
  tabs.push(
    <Tab id="import" label={t("form.sqleditor.label.tab.import")}>
      {tabIndex === tabs.length && (
        <SqlImportTab
          tasks={tasks}
          setTasks={setTasks}
          sqlConnection={sqlConnection}
          dbTable={dbTable}
        />
      )}
    </Tab>,
  );
  tabs.push(
    <Tab id="export" label={t("form.sqleditor.label.tab.export")}>
      {tabIndex === tabs.length && (
        <SqlExportTab
          tasks={tasks}
          setTasks={setTasks}
          sqlConnection={sqlConnection}
        />
      )}
    </Tab>,
  );
  tabs.push(
    <Tab id="users" label={t("form.sqleditor.label.tab.users")}>
      {tabIndex === tabs.length && (
        <SqlUsersTab sqlConnection={sqlConnection} />
      )}
    </Tab>,
  );
  return (
    <Tabs
      currentTab={tabIndex}
      setCurrentTab={(tabIndex) => setTabIndex(tabIndex)}
    >
      {tabs}
    </Tabs>
  );
}

let schemasCache: string[] | undefined = undefined;
let tablesCache: string[] | undefined = undefined;

function SqlPage(props: PageProps) {
  const params = useParams();
  const [sqlConnection, setSqlConnection] = useState<
    SqlType | undefined | void | ""
  >(undefined);
  const [dbSchema, setDbSchema] = useState("USER");
  const [dbTable, setDbTable] = useState("");
  const [loginState, setLoginState] = useState<
    "loading" | "login" | "loginWithRegister" | "connected"
  >("loading");

  const StyledBreadcrumbs = styled(Breadcrumbs)({
    ".MuiBreadcrumbs-ol": {
      flexWrap: "nowrap",
    },
  });

  function tryDbaasLogin(): Promise<SqlType | undefined | void | ""> {
    return new Promise((resolve) => {
      const authUsername = Auth.getCredentials()?.username.replace("/", "_");
      const authToken = Auth.getCredentials()?.token;
      if (
        !params.organization ||
        !params.project ||
        !params.database ||
        !authUsername ||
        !authToken
      ) {
        resolve(undefined);
      } else {
        const conn = SqlSocket(
          params.organization,
          params.project,
          params.database,
          "user",
          authUsername,
          authToken,
        );
        conn
          .runCommand("EXECUTE_QUERY", ["SELECT 1 FROM DUAL"])
          .then((response) => {
            resolve(response.error ? undefined : conn);
          })
          .catch(() => {
            resolve(undefined);
          });
      }
    });
  }

  useEffect(() => {
    tryDbaasLogin().then((sqlConnection: SqlType | undefined | void | "") => {
      if (sqlConnection) {
        setSqlConnection(sqlConnection);
        setLoginState("connected");
      } else {
        setLoginState("loginWithRegister");
      }
    });
  }, []);

  useEffect(() => {
    loadSchemas();
  }, [sqlConnection]);

  useEffect(() => {
    loadTables();
  }, [dbSchema, sqlConnection]);

  async function loadTables(): Promise<MenuItemProps[]> {
    if (!sqlConnection) {
      return new Promise((resolve) => resolve([]));
    }
    tablesCache = [];
    const results = await sqlConnection.runCommand("EXECUTE_QUERY", [
      "SELECT tablename FROM system.tables where type = 'TABLE' and schema = '" +
        dbSchema +
        "'",
    ]);
    if (results.error) {
      Toast.show(results.error, results);
      setDbTable("");
    } else if (results.rows) {
      tablesCache = results.rows.map((row) => row.values[0]);
      if (!tablesCache.includes(dbTable)) {
        if (tablesCache.length > 0) {
          setDbTable(tablesCache[0]);
        } else {
          setDbTable("");
        }
      }
    }

    return new Promise((resolve) =>
      resolve(
        (tablesCache || []).map((table) => {
          return {
            id: table,
            label: table,
            onClick: () => {
              setDbTable(table);
              return true;
            },
          };
        }),
      ),
    );
  }

  async function loadSchemas(): Promise<MenuItemProps[]> {
    if (!sqlConnection) {
      return new Promise((resolve) => resolve([]));
    }

    const results = await sqlConnection.runCommand("EXECUTE_QUERY", [
      "SELECT schema FROM system.schemas",
    ]);
    if (results.error) {
      Toast.show(results.error, results);
      setDbSchema("USER");
    } else if (results.rows) {
      schemasCache = results.rows.map((row) => row.values[0]);
      schemasCache = schemasCache.filter(
        (schema) => schema.toUpperCase() !== "SYSTEM",
      );
      if (!schemasCache.includes("USER")) {
        schemasCache.push("USER");
      }
      if (!schemasCache.includes(dbSchema)) {
        schemasCache.push(dbSchema);
      }
    }

    return new Promise((resolve) =>
      resolve(
        (schemasCache || []).map((schema) => {
          return {
            id: schema,
            label: schema,
            onClick: () => {
              setDbSchema(schema);
              loadTables();
              sqlConnection.setDefaultSchema(schema);
              return true;
            },
          };
        }),
      ),
    );
  }

  function renderContent() {
    if (loginState === "loading") {
      return <div>Loading...</div>;
    } else if (loginState === "login") {
      return (
        <SqlLogin
          setSqlConnection={(sqlConnection) => {
            if (sqlConnection) {
              setSqlConnection(sqlConnection);
              setLoginState("connected");
            } else {
              setLoginState("loading");
            }
          }}
        />
      );
    } else if (loginState === "loginWithRegister") {
      return (
        <SqlLogin
          setSqlConnection={(sqlConnection) => {
            if (sqlConnection) {
              setSqlConnection(sqlConnection);
              setLoginState("connected");
            } else {
              setLoginState("loading");
            }
          }}
          showRegistration={true}
        />
      );
    } else if (sqlConnection && loginState === "connected") {
      return (
        <SqlTabs
          tasks={props.tasks}
          setTasks={props.setTasks}
          dbTable={dbTable}
          sqlConnection={sqlConnection}
        />
      );
    } else {
      return null;
    }
  }

  const breadCrumbs = [
    params.organization,
    params.project,
    params.database,
  ].map((name) => {
    return (
      <Typography
        color="text.primary"
        style={{ fontSize: "1em", textWrap: "nowrap" }}
      >
        {name}
      </Typography>
    );
  });
  if (sqlConnection) {
    breadCrumbs.push(
      <ComboBox loadItems={loadSchemas} selected={dbSchema}>
        <label>{dbSchema}</label>
      </ComboBox>,
    );
    breadCrumbs.push(
      <ComboBox loadItems={loadTables} selected={dbTable}>
        <label>{dbTable}</label>
      </ComboBox>,
    );
  }

  return (
    <PageLayout {...props}>
      <div className="NuoListResourceHeader">
        <h3>{t("form.sqleditor.label.title")}</h3>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <StyledBreadcrumbs
            data-testid="path_component"
            separator=">"
            aria-label="resources"
            style={{
              color: "#b5b9bc",
              fontSize: "1em",
              padding: "0 20px",
              display: "flex",
              flexWrap: "nowrap",
            }}
          >
            {breadCrumbs}
          </StyledBreadcrumbs>
          <div className="NuoRight">
            {(sqlConnection as SqlType)?.getDbUsername() && (
              <div className="NuoRow">
                <Menu
                  popupId="sql_switch"
                  align="right"
                  items={[
                    {
                      id: "switch",
                      label: "Switch Database User",
                      icon: <LogoutIcon />,
                      onClick: () => {
                        setSqlConnection(undefined);
                        setLoginState("login");
                        return true;
                      },
                    },
                  ]}
                >
                  <div className="NuoRow">
                    {(sqlConnection as SqlType)?.getDbUsername()}
                    <ArrowDropDown />
                  </div>
                </Menu>
              </div>
            )}
          </div>
        </div>
      </div>
      {renderContent()}
    </PageLayout>
  );
}

export default withTranslation()(SqlPage);
