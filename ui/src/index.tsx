// (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved.

declare global {
  interface Window {
    trustedTypes?: {
      defaultPolicy?: any;
      createPolicy: (
        policyName: string,
        rules: {
          createHTML?: (str: string) => string;
          createScript?: (str: string) => string;
          createScriptURL?: (str: string) => string;
        },
      ) => any;
    };
  }
}

import React from "react";
import ReactDOM from "react-dom/client";
import "./resources/index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { RemoteStorageBoundary } from "./components/controls/RemoteStorage";

// 1. MUST BE FIRST: Register the default Trusted Types policy to allow Emotion to inject strings
if (typeof window !== "undefined" && window.trustedTypes) {
  if (!window.trustedTypes.defaultPolicy) {
    window.trustedTypes.createPolicy("default", {
      createHTML: (string) => string,
      createScript: (string) => string,
      createScriptURL: (string) => string,
    });
  }
}

// 2. Query the DOM for the live tag where the server successfully replaced the active nonce
const serverInjectedNonce =
  document.querySelector('meta[name="csp-nonce"]')?.getAttribute("content") ||
  document.querySelector('meta[property="csp-nonce"]')?.getAttribute("nonce") ||
  document.querySelector("script[nonce]")?.getAttribute("nonce");

if (!serverInjectedNonce) {
  console.error(
    "NuoDBaaS UI Error: Runtime cryptographic nonce extraction failed!",
  );
}

// 3. Bind the live, active runtime string variable to Emotion (Never a hardcoded text literal)
const myEmotionCache = createCache({
  key: "nuodbaas-webui-app-styles",
  nonce: serverInjectedNonce || undefined,
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <CacheProvider value={myEmotionCache}>
      <RemoteStorageBoundary>
        <App />
      </RemoteStorageBoundary>
    </CacheProvider>
  </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
