// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from "react-router-dom";
import Auth from "../../utils/auth";
import Button from '../controls/Button';
import TextField from '../controls/TextField';
import BuildNumber from "./parts/BuildNumber"
import { withTranslation } from 'react-i18next';
import { TempAny } from '../../utils/types';
import { Rest } from './parts/Rest';
import axios from 'axios';

interface Props {
    setIsLoggedIn: (isLoggedIn: boolean) => void,
    t: TempAny
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
    const [loading, setLoading] = useState(true);
    const [activeForm, setActiveForm] = useState<"local" | "3ds" | null>(null);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const provider = urlParams.get("provider");
        const ticket = urlParams.get("ticket");

        axios.get("/providers.json")
            .then((response) => {
                setProviders(response.data);
            })
            .catch((error) => {
                console.error("Error fetching providers:", error);
            })
            .finally(() => {
                setLoading(false);
            });

        if (provider && ticket) {
            setProgressMessage("Logging in to provider " + provider);
            const service = window.location.protocol + "//" + window.location.host + "/ui/login?provider=" + encodeURIComponent(provider);
            Rest.post("/login/providers/" + encodeURIComponent(provider)
                + "?service=" + encodeURIComponent(service) + "&ticket=" + encodeURIComponent(ticket), "")
                .then((data: TempAny) => {
                    localStorage.setItem("credentials", JSON.stringify({
                        token: data.token,
                        expiresAtTime: data.expiresAtTime,
                        username: data.username
                    }));
                    window.location.href = "/ui";
                }).catch(reason => {
                    setError("Login failed");
                    console.error("Login Failed", reason);
                });
        }
    }, []);

    if (loading) {
        return <div>Loading providers...</div>;
    }

    async function handleLogin() {
        let success = await Auth.login(organization + "/" + username, password);
        if (success) {
            setIsLoggedIn(true);
            navigate(searchParams.get("redirect") || "/ui");
        }
        else {
            setError("Invalid Credentials")
        }
    }

    return (
        <React.Fragment>
            <div className="NuoLoginForm">
                <img alt="" />
                {progressMessage ? <h2>{progressMessage}</h2> :
                <form>

                        {Array.isArray(providers) && providers.length > 0 && (

                            <div style={{ display: "flex", gap: "1rem", margin: "10px" }}>
                                {providers.filter((provider: TempAny) => provider.name == "local").map((provider: TempAny) => (
                                    <Button data-testid="login_local" variant="contained" type="submit" onClick={() => setActiveForm("local")}>Local Login</Button>
                                ))}

                                {providers.filter((provider: TempAny) => provider.name == "cas").map((provider: TempAny) => (
                                    <Button data-testid="login_cas" variant="contained" type="submit" onClick={() => { window.location.href = provider.providerUrl + "?service=" + encodeURIComponent(window.location.protocol + "//" + window.location.host + "/ui/login?provider=" + provider.name) }}>Login with {provider.description}</Button>
                                ))}
                            </div>
                        )}

                        {activeForm === "local" && (
                            <div className="fields">
                                <TextField required data-testid="organization" id="organization" label="Organization" value={organization} onChange={(event) => setOrganization(event.target.value)} />
                                <TextField required data-testid="username" id="username" label="Username" value={username} onChange={(event) => setUsername(event.target.value)} />
                                <TextField required data-testid="password" id="password" type="password" label="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
                                {error && <h3 data-testid="error_message" style={{ color: "red" }}>{error}</h3>}
                                <Button data-testid="login_button" variant="contained" type="submit" onClick={handleLogin}>Login</Button>
                            </div>
                        )}
                </form>
                }
            </div>
            <BuildNumber className="AbsoluteBottomRight BuildNumber" />
        </React.Fragment>
    );
}

export default withTranslation()(LoginForm);