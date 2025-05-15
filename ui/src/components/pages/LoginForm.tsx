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
    const [providers, setProviders] = useState<Provider[]>([]);
    const [progressMessage, setProgressMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
    const [initializing, setInitializing] = useState(true);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const provider = urlParams.get("provider");
        const ticket = urlParams.get("ticket");

        axios.get("/ui/providers.json")
            .then((response) => {
                if (response.data.length === 1) {
                    setSelectedProvider(response.data[0]);
                }
                setProviders(response.data);
            })
            .catch((error) => {
                console.error("Error fetching providers:", error);
            })
            .finally(() => {
                // Don't set loading to false here if we are handling ticket login
                if (!provider || !ticket) {
                    setLoading(false);
                    setInitializing(false);
                }
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
        } else {
            Rest.get("/login/providers").then((data: TempAny) => {
                setProviders(data);
            });
        }
    }, []);

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

    const handleProviderClick = (provider: Provider) => {
        if (provider.type === 'local') {
            setSelectedProvider(provider);
        } else if (provider.providerUrl) {
            setLoading(true);
            window.location.href = provider.providerUrl + "?service=" + encodeURIComponent(window.location.protocol + "//" + window.location.host + "/ui/login?provider=" + provider.name);
        }
    };


    async function handleGoBack() {
        setSelectedProvider(null);
        setError('');
    }

    if (initializing) return null;

    return (
        <React.Fragment>
            <div className="NuoLoginForm">
                <img alt="" />
                {progressMessage && <h2>{progressMessage}</h2>}
                {loading ? <div className="NuoModal" > <div className="spinner" /> t{"form.login.label.loadingProvider"}</div> :
                    !selectedProvider && (
                        <div className="NuoProviderButton">
                            {providers.length !== 1 && providers.map((provider: Provider) => (
                                <Button
                                    data-testid={provider.name}
                                    key={provider.name}
                                    variant="contained"
                                    onClick={() => handleProviderClick(provider)}

                                >
                                    {t("form.login.label.loginWith", { providerDesc: provider.description })}
                                </Button>
                            ))}
                        </div>
                    )
                }

                {selectedProvider?.type === 'local' && (
                    <div className="fields">
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
                            id="password"
                            type="password"
                            label="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        {error && (
                            <h3 data-testid="error_message" style={{ color: 'red' }}>
                                {error}
                            </h3>
                        )}
                        <Button data-testid="login_button" variant="contained" onClick={handleLogin}>
                            {t("form.login.label.loginWith", { providerDesc: selectedProvider.description })}
                        </Button>
                        {providers.length !== 1 && (
                            <Button data-testid="back_button" variant="outlined" onClick={handleGoBack}>
                                {t("form.login.label.goBack")}
                            </Button>
                        )}
                    </div>
                )}
            </div>
            <BuildNumber className="AbsoluteBottomRight BuildNumber" />
        </React.Fragment>
    );
}

export default withTranslation()(LoginForm);