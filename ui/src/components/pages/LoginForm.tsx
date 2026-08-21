// (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved.

import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Auth from "../../utils/auth";
import Button from "../controls/Button";
import TextField from "../controls/TextField";
import BuildNumber from "./parts/BuildNumber";
import { withTranslation } from "react-i18next";
import { RegionSettings, TempAny } from "../../utils/types";
import { Rest } from "./parts/Rest";
import axios from "axios";
import RegionSettingsMenu from "./RegionSettingsMenu";

interface Props {
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  regions: RegionSettings;
  t: TempAny;
}
interface Provider {
  name: string;
  description: string;
  url?: string;
  organization?: string;
}
interface ProvidersResponse {
  items?: Provider[];
}
/**
 * Provides Login form storing credentials (currently username/password) in "credentials" local storage
 * @returns
 */
function LoginForm({ setIsLoggedIn, regions, t }: Props) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(window.location.search);

  const [organization, setOrganization] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [providers, setProviders] = useState<Provider[] | undefined>(undefined);
  const [progressMessage, setProgressMessage] = useState("");
  const [showLoginForm, setShowLoginForm] = useState(false);
  // Specify redirect URL so that provider name is supplied as query parameter
  const redirectUrl =
    window.location.origin +
    "/ui/login?provider={name}&redirectUrl=" +
    encodeURIComponent(
      queryParams.get("redirectUrl") || window.location.origin + "/ui",
    );
  useEffect(() => {
    handleInitialLoad();
  }, []);

  async function handleInitialLoad() {
    const urlParams = new URLSearchParams(window.location.search);
    const provider = urlParams.get("provider");

    if (provider) {
      setProgressMessage(`Logging in with ${provider}...`);
      try {
        const data = await Rest.get(
          `/login/providers/${encodeURIComponent(provider)}/token${
            window.location.search
          }`,
        );
        handleLoginSuccess(data, provider);
      } catch (error: any) {
        loginFailed(error);
      }
    } else {
      const [hasBasicProviders, idpProviders] = await Promise.all([
        fetchHasBasicAuth(),
        fetchProviders(),
      ]);
      const basicProviders = hasBasicProviders
        ? [{ name: "basic", description: "", url: "" }]
        : [];
      const autoLogin = urlParams.get("autoLogin");
      if (idpProviders.length > 0 && autoLogin) {
        let provider = undefined;
        if (autoLogin === "true" && idpProviders.length === 1) {
          provider = idpProviders[0];
        } else {
          provider = idpProviders.find(
            (provider) => provider.name === autoLogin,
          );
        }
        if (provider?.url) {
          window.location.href = provider.url;
          return;
        }
      }
      setProviders([...basicProviders, ...idpProviders]);
    }
  }

  async function fetchProviders(): Promise<Provider[]> {
    try {
      const data = (await Rest.get(
        `/login/providers?redirectUrl=${encodeURIComponent(redirectUrl)}`,
      )) as ProvidersResponse | undefined;
      if (data?.items) {
        return data.items.map((provider) => {
          if (provider.url) {
            //replace hard coded keycloak URL with origin
            provider.url = provider.url.replaceAll(
              "http://ingress-nginx-controller.ingress-nginx.svc.cluster.local",
              window.location.origin,
            );
          }
          return provider;
        });
      }
      return [];
    } catch (err: any) {
      console.error("Failed to fetch providers", err);
      return [];
    }
  }

  /**
   * The purpose of this function is to attempt to log in with invalid credentials
   * and then capture the www-authenticate header from the response.
   * Ensure that the auth Header contains the "Basic" authentication method to render local login form.
   * */
  async function fetchHasBasicAuth(): Promise<boolean> {
    try {
      await axios.post(
        Auth.getNuodbCpRestUrl("login"),
        { expiresIn: "24h" },
        {
          auth: { username: "__INVALID__", password: "__INVALID__" },
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error: any) {
      if (error.response?.headers["www-authenticate"]) {
        return error.response.headers["www-authenticate"]
          .split(",")
          .map((part: string) => part.trim().toLowerCase())
          .includes("basic");
      }
    }
    return false;
  }

  function isSafeRedirect(url: string): boolean {
    try {
      const parsed = new URL(url, window.location.origin);
      return parsed.origin === window.location.origin;
    } catch {
      return false;
    }
  }

  function handleLoginSuccess(data: TempAny, provider: string | null) {
    localStorage.setItem(
      "credentials",
      JSON.stringify({
        token: data.token,
        expiresAtTime: data.expiresAtTime,
        username: data.username,
        accessRule: data.accessRule,
        provider: provider,
      }),
    );
    const redirectUrl =
      queryParams.get("redirectUrl") || window.location.origin + "/ui";
    window.location.href = isSafeRedirect(redirectUrl)
      ? redirectUrl
      : window.location.origin + "/ui";
  }

  function loginFailed(err: any) {
    console.error("Login Failed", err);
    let detailMsg = err?.response?.data?.detail;
    if (!detailMsg) {
      detailMsg = err.message;
    }
    setError("Login failed: " + detailMsg);
  }

  async function handleLogin() {
    if (!organization.trim() || !username.trim() || !password.trim()) {
      setError("All fields are required");
      return;
    }

    const err = await Auth.login(`${organization}/${username}`, password);
    if (!err) {
      setIsLoggedIn(true);
      navigate(searchParams.get("redirectUrl") || "/ui");
    } else {
      loginFailed(err);
    }
  }

  //Rendering helpers
  function renderProgressUI() {
    return (
      <center>
        <Box sx={{ width: "fit-content" }}>
          {error ? (
            <CircularProgress variant="determinate" color="error" value={100} />
          ) : (
            <CircularProgress color="inherit" />
          )}
          <div data-testid="progress_message">{progressMessage}</div>
        </Box>
        {error && (
          <div>
            <h3 data-testid="error_message" style={{ color: "red" }}>
              {error}
            </h3>
            <Button
              data-testid="back_button"
              variant="contained"
              onClick={() => {
                window.location.href = "/ui/login";
              }}
            >
              Back to Login
            </Button>
          </div>
        )}
      </center>
    );
  }

  const handleGoBack = () => {
    setOrganization("");
    setUsername("");
    setPassword("");
    setShowLoginForm(false); // Assuming setShowLoginForm controls visibility of login form
  };

  function renderLoginForm() {
    return (
      <>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
        >
          <TextField
            required
            data-testid="organization"
            id="organization"
            label={t("field.label.organization")}
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
          />
          <TextField
            required
            data-testid="username"
            id="username"
            label={t("field.label.username")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            required
            data-testid="password"
            id="password"
            type="password"
            label={t("field.label.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <h3 data-testid="error_message" style={{ color: "red" }}>
              {error}
            </h3>
          )}
          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <Button
              data-testid="login_button"
              variant="contained"
              type="submit"
              onClick={handleLogin}
            >
              {t("form.login.label.login")}
            </Button>
            {providers && providers.length > 0 && (
              <Button
                data-testid="back_button"
                variant="outlined"
                onClick={handleGoBack}
              >
                {t("form.login.label.goBack")}
              </Button>
            )}
          </div>
        </form>
      </>
    );
  }

  function renderLoginButtons() {
    return (
      <>
        {providers &&
          providers.find((provider) => provider.name === "basic") &&
          !showLoginForm && (
            <Button
              data-testid="show_login_button"
              variant="contained"
              onClick={() => setShowLoginForm(true)}
            >
              {t("form.login.label.login")}
            </Button>
          )}

        {providers &&
          providers
            .filter(
              (provider) =>
                provider.name !== "basic" &&
                provider.description &&
                (provider.url?.toLowerCase().startsWith("https://") || //prevents XSS by preventing a "javascript:" URL
                  provider.url?.toLowerCase().startsWith("http://")),
            )
            .map((provider) => (
              <Button
                key={provider.name}
                data-testid={`login_${provider.name}`}
                variant="contained"
                onClick={() => {
                  if (!provider.url) {
                    return;
                  }
                  window.location.href = `${provider.url}&redirectUrl=${encodeURIComponent(redirectUrl)}`;
                }}
              >
                {t("form.login.label.loginWith", {
                  providerDesc: provider.description,
                })}
              </Button>
            ))}
      </>
    );
  }

  return (
    <>
      <RegionSettingsMenu regions={regions} />
      <div className="NuoLoginForm">
        <img alt="" />
        {progressMessage ? (
          renderProgressUI()
        ) : (
          <div className="fields">
            {providers === undefined ? (
              <CircularProgress className="RestSpinner" color="inherit" />
            ) : providers.length === 0 || showLoginForm ? (
              renderLoginForm()
            ) : (
              renderLoginButtons()
            )}
          </div>
        )}
      </div>
      <BuildNumber className="AbsoluteBottomRight BuildNumber" />
    </>
  );
}

export default withTranslation()(LoginForm);
