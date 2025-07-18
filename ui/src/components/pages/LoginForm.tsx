// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Auth from "../../utils/auth";
import Button from "../controls/Button";
import TextField from "../controls/TextField";
import BuildNumber from "./parts/BuildNumber";
import { withTranslation } from "react-i18next";
import { TempAny } from "../../utils/types";
import { Rest } from "./parts/Rest";
import axios from "axios";

interface Props {
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  t: TempAny;
}
interface Provider {
    name: string;
    description: string;
    type: string;
    providerUrl?: string;
    organization?: string;
}

/**
 * Provides Login form storing credentials (currently username/password) in "credentials" local storage
 * @returns
 */
function LoginForm({ setIsLoggedIn, t }: Props) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [organization, setOrganization] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [providers, setProviders] = useState([]);
  const [progressMessage, setProgressMessage] = useState("");
  const [authHeader, setAuthHeader] = useState("");
  const [showLoginForm, setShowLoginForm] = useState(false);
  // Specify redirect URL so that provider name is supplied as query parameter
  const redirectUrl = encodeURIComponent(window.location.protocol + "//" + window.location.host + "/ui/login?provider={name}");

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
          `/login/providers/${encodeURIComponent(provider)}/token${window.location.search}&redirectUrl=${redirectUrl}`,
          ""
        );
        handleLoginSuccess(data);
      } catch (error) {
        loginFailed(error);
      }
    } else {
      fetchProviders();
      fetchAuthHeader();
    }
  }

  async function fetchProviders() {
    try {
      const data = await Rest.get(`/login/providers?redirectUrl=${redirectUrl}`);
      if (data?.items) {
        setProviders(data.items);
      }
    } catch (err) {
      console.error("Failed to fetch providers", err);
    }
  }

  async function fetchAuthHeader() {
    try {
      await axios.post(
        Auth.getNuodbCpRestUrl("login"),
        { expiresIn: "24h" },
        {
          auth: { username: "__INVALID__", password: "__INVALID__" },
          headers: { "Content-Type": "application/json" },
        }
      )
    } catch (error) {
      if (error.response?.headers["www-authenticate"]) {
        setAuthHeader(error.response.headers["www-authenticate"]);
      }
    }
  }

  function handleLoginSuccess(data: TempAny) {
    localStorage.setItem(
      "credentials",
      JSON.stringify({
        token: data.token,
        expiresAtTime: data.expiresAtTime,
        username: data.username,
      })
    );
    window.location.href = "/ui";
  }

  function loginFailed(err: Error) {
    console.error("Login Failed", err);
    var detailMsg = err?.response?.data?.detail;
    if (!detailMsg) {
      detailMsg = err.message;
    }
    setError("Login failed: " + detailMsg);
  }

  async function handleLogin() {
    const err = await Auth.login(`${organization}/${username}`, password);
    if (!err) {
      setIsLoggedIn(true);
      navigate(searchParams.get("redirect") || "/ui");
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

  function renderLoginForm() {
    return (
      <>
        <TextField
          required
          data-testid="organization"
          id="organization"
          label="Organization"
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
        />
        <TextField
          required
          data-testid="username"
          id="username"
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <TextField
          required
          data-testid="password"
          type="password"
          label="Password"
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
            Login
          </Button>
          <Button
            data-testid="back_button"
            variant="outlined"
            onClick={() => setShowLoginForm(false)}
          >
            Back
          </Button>
        </div>
      </>
    );
  }

  function renderLoginButtons() {
    return (
      <>
        {authHeader.split(",").includes("Basic") && !showLoginForm && (
          <Button
            data-testid="show_login_button"
            variant="contained"
            onClick={() => setShowLoginForm(true)}
          >
            Login with local login  
          </Button>
        )}

        {providers
          .filter((provider) => provider.description)
          .map((provider) => (
            <Button
              key={provider.name}
              data-testid={`login_${provider.name}`}
              variant="contained"
              onClick={() =>
                (window.location.href = `${provider.url}&redirectUrl=${redirectUrl}`)
              }
            >
              Login with {provider.description}
            </Button>
          ))}
      </>
    );
  }

  return (
    <>
      <div className="NuoLoginForm">
        <img alt="" />
        {progressMessage ? (
          renderProgressUI()
        ) : (
          <div className="fields">
            {showLoginForm ? renderLoginForm() : renderLoginButtons()}
          </div>
        )}
      </div>
      <BuildNumber className="AbsoluteBottomRight BuildNumber" />
    </>
  );
}

export default withTranslation()(LoginForm);
