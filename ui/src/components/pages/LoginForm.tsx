// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import React, { useState } from 'react';
import { useSearchParams, useNavigate } from "react-router-dom";
import Auth from "../../utils/auth";
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Container from '@mui/material/Container'
import BuildNumber from "./parts/BuildNumber"

interface Props {
    setIsLoggedIn: (isLoggedIn: boolean) => void
}

/**
 * Provides Login form storing credentials (currently username/password) in "credentials" local storage
 * @returns
 */
export default function LoginForm({ setIsLoggedIn }: Props) {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [organization, setOrganization] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    async function handleLogin(e: React.MouseEvent) {
        e.preventDefault();
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
            <Container maxWidth="sm">
                <h3>NuoDB Login</h3>
                <form>
                    <div className="fields">
                        <TextField required data-testid="organization" label="Organization" value={organization} onChange={(event) => setOrganization(event.target.value)} />
                        <TextField required data-testid="username" label="Username" value={username} onChange={(event) => setUsername(event.target.value)} />
                        <TextField required data-testid="password" type="password" label="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
                        {error && <h3 data-testid="error_message" style={{ color: "red" }}>{error}</h3>}
                        <Button data-testid="login_button" variant="contained" type="submit" onClick={handleLogin}>Login</Button>
                    </div>
                </form>
            </Container>
            <BuildNumber className="AbsoluteBottomRight BuildNumber" />
        </React.Fragment>
    );
}
