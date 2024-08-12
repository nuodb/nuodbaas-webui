import React, { useState } from 'react';
import { Routes, Route, BrowserRouter, Navigate } from "react-router-dom";
import LoginForm from "./components/pages/LoginForm";
import Home from "./components/pages/Home";
import ListResource from "./components/pages/ListResource";
import CreateResource from "./components/pages/CreateResource";
import EditResource from "./components/pages/EditResource";
import ErrorPage from "./components/pages/ErrorPage";
import Banner from "./components/pages/parts/Banner";
import Schema from "./components/pages/parts/Schema";
import CssBaseline from '@mui/material/CssBaseline';
import NotFound from "./components/pages/NotFound";
import Dialog from "./components/pages/parts/Dialog";
import Auth from "./utils/auth";

export default function App() {
  const [schema, setSchema] = useState();
  const [isLoggedIn, setIsLoggedIn] = useState(Auth.isLoggedIn());
  return (
    <div className="App">
      <CssBaseline/>
      <Dialog/>
      <BrowserRouter>
        {isLoggedIn
          ?
          <React.Fragment>
            <Schema setSchema={setSchema} />
            {schema && <Banner schema={schema} />}
            <Routes>
              <Route path="/" element={<Navigate to="/ui" />} />
              <Route path="/ui" element={<Home schema={schema} />} />
              <Route path="/ui/error" element={<ErrorPage />} />
              <Route path="/ui/resource/list/*" element={<ListResource schema={schema} />} />
              <Route path="/ui/resource/create/*" element={<CreateResource schema={schema} />} />
              <Route path="/ui/resource/edit/*" element={<EditResource schema={schema} />} />
              <Route path="/*" element={<NotFound />} />
            </Routes></React.Fragment>
          :
          <Routes>
            <Route path="/ui/login" element={<LoginForm setIsLoggedIn={setIsLoggedIn}/>} />
            <Route path="/ui/error" element={<ErrorPage />} />
            <Route path="/*" element={<Navigate to={"/ui/login?redirect=" + encodeURIComponent(window.location.pathname)} />} />
          </Routes>
        }
      </BrowserRouter>
    </div>
  );
}
