// (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved.

import React, { useEffect, useState } from "react";
import "./utils/i18n";
import { Routes, Route, BrowserRouter, Navigate, useParams } from "react-router-dom";
import LoginForm from "./components/pages/LoginForm";
import ListResource from "./components/pages/ListResource";
import CreateResource from "./components/pages/CreateResource";
import EditResource from "./components/pages/EditResource";
import ViewResource from "./components/pages/ViewResource";
import ErrorPage from "./components/pages/ErrorPage";
import SqlPage from "./components/pages/SqlPage";
import Schema from "./components/pages/parts/Schema";
import CssBaseline from "@mui/material/CssBaseline";
import NotFound from "./components/pages/NotFound";
import Dialog from "./components/pages/parts/Dialog";
import GlobalErrorBoundary from "./components/GlobalErrorBoundary";
import Auth from "./utils/auth";
import Settings from "./components/pages/Settings";
import Automation from "./components/pages/Automation";
import Customizations, { evaluate } from "./utils/Customizations";
import {
  NUODBAAS_WEBUI_ISRECORDING,
  Rest,
} from "./components/pages/parts/Rest";
import { getOrgFromPath } from "./utils/schema";
import Toast from "./components/controls/Toast";
import BackgroundTasks, { BackgroundTaskType, generateRandom } from "./utils/BackgroundTasks";
import { withTranslation } from "react-i18next";
import { TFunction } from "i18next";
import Redirect from "./components/pages/Redirect";
import DefaultPage from "./components/pages/DefaultPage";
import RegionSettingsSelector from "./components/pages/RegionSettingsSelector";
import { RegionSetting, RegionSettings } from "./utils/types";
import axios from "axios";

/**
 * React Root Application. Sets up dialogs, BrowserRouter and Schema from Control Plane
 * @returns
 */
function App({ t }: { t: TFunction }) {
  const { region } = useParams();
  const [schema, setSchema] = useState<any>();
  const [isLoggedIn, setIsLoggedIn] = useState(Auth.isLoggedIn());
  const [isRecording, setIsRecording] = useState(
    sessionStorage.getItem(NUODBAAS_WEBUI_ISRECORDING) === "true",
  );
  const [org, setOrg] = useState("");
  const [orgs, setOrgs] = useState<string[]>([]);
  const [tasks, setTasks] = useState<BackgroundTaskType[]>([]);
  const pageProps = {
    schema,
    isRecording,
    org,
    setOrg,
    orgs,
    tasks,
    setTasks: setTasks,
  };

  async function getRegionFromUrl() {
    let currentRegion: RegionSetting = {
      name: window.location.host,
      manual: false,
      id: generateRandom(),
      uiUrl: Auth.getDefaultUiPrefixPath(),
      cpUrl: Auth.getDefaultCpPrefixPath(),
      sqlUrl: Auth.getDefaultSqlPrefixPath(),
    };

    try {
      currentRegion = {
        ...currentRegion,
        ...(await axios.get(window.location.origin + "/ui/config.json")).data
      }
      currentRegion.name = currentRegion.name || window.location.host;
    }
    catch (ex) {
      console.log("ERROR: unable to load /ui/config.json. Setting to default URL's.", ex);
    }

    if (currentRegion.uiUrl.startsWith("/")) {
      currentRegion.uiUrl = window.location.origin + currentRegion.uiUrl;
    }
    if (currentRegion.cpUrl.startsWith("/")) {
      currentRegion.cpUrl = window.location.origin + currentRegion.cpUrl;
    }
    if (currentRegion.sqlUrl.startsWith("/")) {
      currentRegion.sqlUrl = window.location.origin + currentRegion.sqlUrl;
    }

    return currentRegion;
  }

  useEffect(() => {
    Auth.refreshRegions().then(async strRegions => {
      console.log("RefreshRegion", region);
      let regions: RegionSettings = JSON.parse(strRegions as any) || [];
      const currentRegion: RegionSetting = region && regions.find(r => r.id === region) || await getRegionFromUrl();

      const matchedRegionIndex = regions.findIndex(region => region.uiUrl === currentRegion.uiUrl && region.cpUrl === currentRegion.cpUrl && region.sqlUrl === currentRegion.sqlUrl);
      console.log("matchedRegionIndex", matchedRegionIndex, regions, currentRegion);
      if (matchedRegionIndex === -1) {
        regions = [currentRegion, ...regions];
      }
      else {
        regions = [regions[matchedRegionIndex], ...regions.filter((_, index) => index !== matchedRegionIndex)];
      }
      Auth.setRegions(regions);
    })
  }, [])

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    // get orgs by scanning all accessible users and projects
    Promise.all([
      Rest.get("/users?listAccessible=true"),
      Rest.get("/projects?listAccessible=true"),
    ]).then((usersAndProjects: any[]) => {
      const data: string[] = [
        ...usersAndProjects[0].items,
        ...usersAndProjects[1].items,
      ];
      const orgs: string[] = [];
      data.forEach((item: string) => {
        const org = item.split("/")[0];
        if (!orgs.includes(org)) {
          orgs.push(org);
        }
      });
      setOrgs(orgs);

      // get selected org from URL path
      let org = "";
      let path = window.location.pathname;
      if (path.startsWith("/ui/resource/")) {
        path = path.substring("/ui/resource/".length);
        const posSlash = path.indexOf("/");
        if (posSlash !== -1) {
          org = getOrgFromPath(schema, path.substring(posSlash));
        }
      }
      setOrg(org);
    });
  }, [schema, isLoggedIn]);

  useEffect(() => {
    const onUnload = (event: BeforeUnloadEvent) => {
      const ABORT_MESSAGE = "Background tasks are still in progress.";
      const pendingTasks = tasks.filter(
        (t) => t.status === "in_progress" || t.status === "not_started",
      );
      if (pendingTasks.length > 0) {
        Dialog.ok(
          ABORT_MESSAGE,
          <div className="NuoColumn">
            {pendingTasks.map((task) => (
              <div>{task.label}</div>
            ))}
          </div>,
          t,
        );
        event.preventDefault();
        return ABORT_MESSAGE;
      } else {
        return null;
      }
    };

    window.addEventListener("beforeunload", onUnload);

    return () => {
      window.removeEventListener("beforeunload", onUnload); // Clean up the event listener
    };
  }, [tasks]);

  return (
    <div className="App" data-testid={orgs.length > 0 ? "banner-done" : ""}>
      <GlobalErrorBoundary>
        <BackgroundTasks tasks={tasks} setTasks={setTasks} />
        <Customizations>
          <CssBaseline />
          <Dialog />
          <Toast />
          <Rest isRecording={isRecording} setIsRecording={setIsRecording} />
          <BrowserRouter>
            {isLoggedIn ? (
              <React.Fragment>
                <Schema setSchema={setSchema} />
                <Routes>
                  <Route path="/" element={<Navigate to="/ui" />} />
                  <Route
                    path="/ui/error"
                    element={<ErrorPage {...pageProps} />}
                  />
                  <Route
                    path="/ui/resource/list/*"
                    element={<ListResource {...pageProps} />}
                  />
                  <Route
                    path="/ui/resource/create/*"
                    element={<CreateResource {...pageProps} />}
                  />
                  <Route
                    path="/ui/resource/edit/*"
                    element={<EditResource {...pageProps} />}
                  />
                  <Route
                    path="/ui/resource/view/*"
                    element={<ViewResource {...pageProps} />}
                  />
                  <Route
                    path="/ui/settings"
                    element={<Settings {...pageProps} />}
                  />
                  <Route
                    path="/ui/automation"
                    element={<Automation {...pageProps} />}
                  />
                  {evaluate({}, "hasSqlEditorService()") && (
                    <Route
                      path="/ui/page/sql/:organization/:project/:database"
                      element={<SqlPage {...pageProps} />}
                    />
                  )}
                  <Route
                    path="/ui/region-selector-settings"
                    element={
                      <RegionSettingsSelector
                        {...pageProps}
                      />
                    }
                  />
                  <Route path="/ui/login" element={<DefaultPage />} />
                  <Route path="/ui" element={<DefaultPage />} />
                  <Route path="/ui/*" element={<NotFound {...pageProps} />} />
                  <Route path="/webui" element={<Navigate to="/ui" />} />
                  <Route path="/webui/*" element={<Redirect baseUrl="/ui" />} />
                  <Route path="*" element={<NotFound {...pageProps} />} />
                </Routes>
              </React.Fragment>
            ) : (
              <Routes>
                <Route
                  path="/ui/region-selector-settings"
                  element={
                    <RegionSettingsSelector {...pageProps} />
                  }
                />
                <Route
                  path="/ui/login"
                  element={
                    <LoginForm
                      setIsLoggedIn={setIsLoggedIn}
                    />
                  }
                />
                <Route
                  path="/ui/error"
                  element={<ErrorPage {...pageProps} />}
                />
                <Route
                  path="/*"
                  element={
                    <Navigate
                      to={
                        "/ui/login?redirectUrl=" +
                        encodeURIComponent(window.location.href) +
                        "&autoLogin=" +
                        (Auth.getCurrentProvider() || "true")
                      }
                    />
                  }
                />
              </Routes>
            )}
          </BrowserRouter>
        </Customizations>
      </GlobalErrorBoundary>
    </div>
  );
}

export default withTranslation()(App);
