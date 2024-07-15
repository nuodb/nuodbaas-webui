import { useState } from 'react';
import { useSearchParams, useNavigate } from "react-router-dom";
import Auth from "../../utils/auth";
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Container from '@mui/material/Container'

/**
 * Provides Login form storing credentials (currently username/password) in "credentials" local storage
 * @returns
 */
export default function LoginForm({setIsLoggedIn}) {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    async function handleLogin(e) {
        e.preventDefault();
        let success = await Auth.login(username, password);
        if(success) {
            setIsLoggedIn(true);
            navigate(searchParams.get("redirect") || "/ui");
        }
        else {
            setError("Invalid Credentials")
        }
    }

    return (
        <Container maxWidth="sm">
            <h3>Login</h3>
            <form>
                <div className="fields">
                    <TextField required data-testid="username" label="Username" value={username} onChange={(event) => setUsername(event.target.value)}/>
                    <TextField required data-testid="password" type="password" label="password" value={password} onChange={(event) => setPassword(event.target.value)}/>
                    {error && <h3 data-testid="error_message" style={{color: "red"}}>{error}</h3>}
                    <Button data-testid="login_button" variant="contained" type="submit" onClick={handleLogin}>Login</Button>
                </div>
            </form>
        </Container>
    );
}
