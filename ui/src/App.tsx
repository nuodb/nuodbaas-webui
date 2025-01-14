// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import React, { useState } from 'react';
import './utils/i18n';
import { Routes, Route, BrowserRouter, Navigate } from "react-router-dom";
import LoginForm from "./components/pages/LoginForm";
import Home from "./components/pages/Home";
import ListResource from "./components/pages/ListResource";
import CreateResource from "./components/pages/CreateResource";
import EditResource from "./components/pages/EditResource";
import ViewResource from "./components/pages/ViewResource";
import ErrorPage from "./components/pages/ErrorPage";
import Banner from "./components/pages/parts/Banner";
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

/**
 * React Root Application. Sets up dialogs, BrowserRouter and Schema from Control Plane
 * @returns
 */
export default function App() {
  const [schema, setSchema] = useState();
  const [isLoggedIn, setIsLoggedIn] = useState(Auth.isLoggedIn());
  const [isRecording, setIsRecording] = useState(sessionStorage.getItem(NUODBAAS_WEBUI_ISRECORDING) === "true");
  return (
    <div className="App">
      <GlobalErrorBoundary>
        <Customizations>
          <CssBaseline />
          <PopupMenu />
          <Dialog />
          <Rest isRecording={isRecording} setIsRecording={setIsRecording} />
          <BrowserRouter>
            {isLoggedIn
              ?
              <React.Fragment>
                <Schema setSchema={setSchema} />
                {schema && <Banner schema={schema} isRecording={isRecording} />}
                <Routes>
                  <Route path="/" element={<Navigate to="/ui" />} />
                  <Route path="/ui" element={<Home schema={schema} />} />
                  <Route path="/ui/error" element={<ErrorPage />} />
                  <Route path="/ui/resource/list/*" element={<ListResource schema={schema} />} />
                  <Route path="/ui/resource/create/*" element={<CreateResource schema={schema} />} />
                  <Route path="/ui/resource/edit/*" element={<EditResource schema={schema} />} />
                  <Route path="/ui/resource/view/*" element={<ViewResource schema={schema} />} />
                  <Route path="/ui/settings" element={<Settings />} />
                  <Route path="/ui/automation" element={<Automation isRecording={isRecording} />} />
                  <Route path="/*" element={<NotFound />} />
                </Routes></React.Fragment>
              :
              <Routes>
                <Route path="/ui/login" element={<LoginForm setIsLoggedIn={setIsLoggedIn} />} />
                <Route path="/ui/error" element={<ErrorPage />} />
                <Route path="/*" element={<Navigate to={"/ui/login?redirect=" + encodeURIComponent(window.location.pathname)} />} />
              </Routes>
            }
          </BrowserRouter>
        </Customizations>
      </GlobalErrorBoundary>
    </div>
  );
}
