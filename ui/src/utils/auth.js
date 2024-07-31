import axios from "axios";

/**
 * Authenticates users and stores info in localStorage "credentials".
 * TODO(agr22): At some point we should change to token authentication
 */

export default class Auth {
    static isLoggedIn() {
        return this.getCredentials() ? true : false;
    }

    static getNuodbCpRestUrl() {
        // The default for the NuoDB REST Control Plane prefix is "/nuodb-cp", which can be overwritten by the
        // environment variable NUODB_CP_REST_URL in the Docker container or Helm Chart config.
        //
        // When the Docker container starts up, it will replace "___NUODB_CP_REST_URL___" in the
        // built client with the custom URL using string replacement. I had to prevent the JavaScript
        // optimizer / webpack to optimize the next line, that's why I split the constant and made it
        // dependent on the current time (it will always be after January 1, 1970)
        if ("___NUODB_CP_REST_URL___" !== "___NUODB_CP" + (Date.now() > 0 ? "_REST_URL___" : "")) {
            return "___NUODB_CP_REST_URL___";
        }
        else {
            return "/nuodb-cp";
        }
    }

    static async login(username, password) {
        return new Promise((resolve) => {
            axios.post(Auth.getNuodbCpRestUrl() + "/login", { "expiresIn": "24h" }, { auth: { username, password }, headers: { "Content-Type": "application/json" } })
                .then((response) => {
                    if(response.data && response.data.token && response.data.expiresAtTime) {
                        localStorage.setItem("credentials", JSON.stringify({
                            token: response.data.token,
                            expiresAtTime: response.data.expiresAtTime,
                            username
                        }));
                        resolve(true);
                    }
                })
                .catch(() => resolve(false));
        });
    }

    static logout() {
        localStorage.removeItem("credentials");
    }

    static getAvatarText() {
        let credentials = this.getCredentials();
        if(credentials) {
            let parts = credentials.username.split("/");
            if(parts.length > 0) {
                let name = parts[parts.length-1];
                if(name.length > 0) {
                    return name[0].toUpperCase();
                }
            }
        }
        return null;
    }

    static getCredentials() {
        let credentials = localStorage.getItem("credentials");
        if(credentials) {
            credentials = JSON.parse(credentials);
        }
        return credentials;
    }

    static getHeaders() {
        let credentials = this.getCredentials();
        if(!credentials) {
            return {};
        }
        else {
            return { "Authorization": "Bearer " + credentials.token}
        }
    }

    static handle401Error(error) {
        if(error.response && error.response.status === 401) {
            Auth.logout();
            window.location.href = "/ui/login?redirect=" + encodeURIComponent(window.location.pathname);
        }
    }
}