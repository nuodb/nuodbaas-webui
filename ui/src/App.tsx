// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import React, { useEffect, useState } from 'react';
import './utils/i18n';
import { Routes, Route, BrowserRouter, Navigate } from "react-router-dom";
import LoginForm from "./components/pages/LoginForm";
import ListResource from "./components/pages/ListResource";
import CreateResource from "./components/pages/CreateResource";
import EditResource from "./components/pages/EditResource";
import ViewResource from "./components/pages/ViewResource";
import ErrorPage from "./components/pages/ErrorPage";
import SqlPage from "./components/pages/SqlPage";
import Schema from "./components/pages/parts/Schema";
import CssBaseline from '@mui/material/CssBaseline';
import NotFound from "./components/pages/NotFound";
import Dialog from "./components/pages/parts/Dialog";
import GlobalErrorBoundary from "./components/GlobalErrorBoundary";
import Auth from "./utils/auth";
import Settings from './components/pages/Settings';
import Automation from './components/pages/Automation';
import Customizations from './utils/Customizations';
import { PopupMenu } from './components/controls/Menu';
import { NUODBAAS_WEBUI_ISRECORDING, Rest } from './components/pages/parts/Rest';
import OrganizationOverview from './components/pages/OrganizationOverview';
import { getOrgFromPath } from './utils/schema';
import Toast from './components/controls/Toast';

/**
 * React Root Application. Sets up dialogs, BrowserRouter and Schema from Control Plane
 * @returns
 */
export default function App() {
  const [schema, setSchema] = useState();
  const [isLoggedIn, setIsLoggedIn] = useState(Auth.isLoggedIn());
  const [isRecording, setIsRecording] = useState(sessionStorage.getItem(NUODBAAS_WEBUI_ISRECORDING) === "true");
  const [org, setOrg] = useState("");
  const [orgs, setOrgs] = useState<string[]>([]);
  const pageProps = { schema, isRecording, org, setOrg, orgs };

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    // get orgs by scanning all accessible users and projects
    Promise.all([Rest.get("/users?listAccessible=true"), Rest.get("/projects?listAccessible=true")]).then((usersAndProjects: any[]) => {
      const data: any = [...usersAndProjects[0].items, ...usersAndProjects[1].items];
      let orgs: string[] = [];
      data.forEach((item: string) => {
        let org = item.split("/")[0];
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

  function getHomeUrl() {
    const credentials = Auth.getCredentials();
    if (credentials) {
      return "/ui/resource/list/databases/" + encodeURIComponent(credentials.username.split("/")[0]);
    }
    else {
      return "/ui/resource/list/databases";
    }
  }

  return (
    <div className="App" data-testid={orgs.length > 0 ? "banner-done" : ""}>
      <GlobalErrorBoundary>
        <Customizations>
          <CssBaseline />
          <PopupMenu />
          <Dialog />
          <Toast />
          <Rest isRecording={isRecording} setIsRecording={setIsRecording} />
          <BrowserRouter>
            {isLoggedIn
              ?
              <React.Fragment>
                <Schema setSchema={setSchema} />
                <Routes>
                  <Route path="/" element={<Navigate to="/ui" />} />
                  <Route path="/ui/error" element={<ErrorPage {...pageProps} />} />
                  <Route path="/ui/resource/list/*" element={<ListResource {...pageProps} />} />
                  <Route path="/ui/resource/create/*" element={<CreateResource {...pageProps} />} />
                  <Route path="/ui/resource/edit/*" element={<EditResource {...pageProps} />} />
                  <Route path="/ui/resource/view/*" element={<ViewResource {...pageProps} />} />
                  <Route path="/ui/settings" element={<Settings {...pageProps} />} />
                  <Route path="/ui/automation" element={<Automation {...pageProps} />} />
                  <Route path="/ui/page/organization" element={<OrganizationOverview {...pageProps} />} />
                  <Route path="/ui/page/sql/:organization/:project/:database" element={<SqlPage {...pageProps} />} />
                  <Route path="/ui" element={<Navigate to={getHomeUrl()} />} />
                  <Route path="/*" element={<NotFound {...pageProps} />} />
                </Routes>
              </React.Fragment>
              :
              <Routes>
                <Route path="/ui/login" element={<LoginForm setIsLoggedIn={setIsLoggedIn} />} />
                <Route path="/ui/error" element={<ErrorPage {...pageProps} />} />
                <Route path="/*" element={<Navigate to={"/ui/login?redirect=" + encodeURIComponent(window.location.pathname)} />} />
              </Routes>
            }
          </BrowserRouter>
        </Customizations>
      </GlobalErrorBoundary>
    </div>
  );
}
