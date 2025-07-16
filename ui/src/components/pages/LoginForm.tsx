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
  const redirectUrl = encodeURIComponent(
    window.location.protocol +
      "//" +
      window.location.host +
      "/ui/login?provider={name}"
  );

  function loginFailed(err: Error) {
    console.error("Login Failed", err);
    var detailMsg = err?.response?.data?.detail;
    if (!detailMsg) {
      detailMsg = err.message;
    }
    setError("Login failed: " + detailMsg);
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const provider = urlParams.get("provider");
    if (provider) {
      setProgressMessage("Logging in with " + provider + "...");
      Rest.get(
        "/login/providers/" +
          encodeURIComponent(provider) +
          "/token" +
          window.location.search +
          "&redirectUrl=" +
          redirectUrl,
        ""
      )
        .then((data: TempAny) => {
          localStorage.setItem(
            "credentials",
            JSON.stringify({
              token: data.token,
              expiresAtTime: data.expiresAtTime,
              username: data.username,
            })
          );
          window.location.href = "/ui";
        })
        .catch(loginFailed);
    } else {
      Rest.get("/login/providers?redirectUrl=" + redirectUrl).then(
        (data: TempAny) => {
          if (typeof data === "object" && "items" in data) {
            setProviders(data.items);
          }
        }
      );

      axios
        .post(
          Auth.getNuodbCpRestUrl("login"),
          { expiresIn: "24h" },
          {
            auth: { username: "__INVALID__", password: "__INVALID__" },
            headers: { "Content-Type": "application/json" },
          }
        )
        .then((response) => {
          console.log("Success:", response.data);
        })
        .catch((error) => {
          if (error.response && error.response.headers["www-authenticate"]) {
            setAuthHeader(error.response.headers["www-authenticate"]);
          }
        });
    }
  }, []);

  async function handleLogin() {
    let err = await Auth.login(organization + "/" + username, password);
    if (!err) {
      setIsLoggedIn(true);
      navigate(searchParams.get("redirect") || "/ui");
    } else {
      loginFailed(err);
    }
  }

  return (
    <React.Fragment>
      <div className="NuoLoginForm">
        <img alt="" />
        {progressMessage ? (
          <center>
            <Box sx={{ width: "fit-content" }}>
              {error ? (
                <CircularProgress
                  variant="determinate"
                  color="error"
                  value="100"
                />
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
                  type="submit"
                  onClick={() => {
                    window.location.href =
                      window.location.protocol +
                      "//" +
                      window.location.host +
                      "/ui/login";
                  }}
                >
                  Back to Login
                </Button>
              </div>
            )}
          </center>
        ) : (
          <div className="fields">
  {showLoginForm ? (
    <>
      <TextField
        required
        data-testid="organization"
        id="organization"
        label="Organization"
        value={organization}
        onChange={(event) => setOrganization(event.target.value)}
      />
      <TextField
        required
        data-testid="username"
        id="username"
        label="Username"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
      />
      <TextField
        required
        data-testid="password"
        type="password"
        label="Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
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
  ) : (
    <>
      {authHeader.includes("Basic") && (
        <Button
          data-testid="show_login_button"
          variant="contained"
          onClick={() => setShowLoginForm(true)}
        >
          Login with Basic Auth
        </Button>
      )}

      {/* Only show third-party providers if not in basic login mode */}
      {providers
        .filter((provider: TempAny) => provider.description)
        .map((provider: TempAny) => (
          <Button
            key={provider.name}
            data-testid={"login_" + provider.name}
            variant="contained"
            onClick={() => {
              window.location.href =
                provider.url + "&redirectUrl=" + redirectUrl;
            }}
          >
            Login with {provider.description}
          </Button>
        ))}
    </>
  )}
</div>

        )}
      </div>
      <BuildNumber className="AbsoluteBottomRight BuildNumber" />
    </React.Fragment>
  );
}

export default withTranslation()(LoginForm);
