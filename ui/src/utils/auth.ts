// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.
import axios from "axios";
import { TempAny } from "./types";

/**
 * Authenticates users and stores info in localStorage "credentials".
 */

interface Credentials {
    token: string,
    expiresAtTime: string,
    username: string
}

export default class Auth {
    static isLoggedIn() : boolean {
        return this.getCredentials() ? true : false;
    }

    static getNuodbCpRestUrl(path:string) {
        // The default for the NuoDB REST Control Plane prefix is "/nuodb-cp", which can be overwritten by the
        // environment variable NUODB_CP_REST_URL in the Docker container or Helm Chart config.
        //
        // When the Docker container starts up, it will replace "___NUODB_CP_REST_URL___" in the
        // built client with the custom URL using string replacement. I had to prevent the JavaScript
        // optimizer / webpack to optimize the next line, that's why I split the constant and made it
        // dependent on the current time (it will always be after January 1, 1970)
        let prefixPath = "/nuodb-cp"
        if ("___NUODB_CP_REST_URL___" !== "___NUODB_CP" + (Date.now() > 0 ? "_REST_URL___" : "")) {
            prefixPath = "___NUODB_CP_REST_URL___";
        }

        while(prefixPath.endsWith("/")) {
            prefixPath.substring(0, prefixPath.length-1);
        }

        while(path.startsWith("/")) {
            path = path.substring(1);
        }

        return prefixPath + "/" + path;
    }

    static async login(username:string, password:string) {
        return new Promise((resolve) => {
            axios.post(Auth.getNuodbCpRestUrl("login"), { "expiresIn": "24h" }, { auth: { username, password }, headers: { "Content-Type": "application/json" } })
                .then((response) => {
                    if(response.data && response.data.token && response.data.expiresAtTime) {
                        localStorage.setItem("credentials", JSON.stringify({
                            token: response.data.token,
                            expiresAtTime: response.data.expiresAtTime,
                            accessRule: response.data.accessRule,
                            username
                        }));
                        resolve(null);
                    }
                })
                .catch(resolve);
        });
    }

    static hasAccess(method: "GET"|"PUT"|"PATCH"|"DELETE", path: string, sla?: string) : boolean {
        function isMatch(rule: string) {
            const ruleParts = rule.split(":");
            if(ruleParts.length < 2) {
                return false;
            }
            const verb = ruleParts[0];
            const resourceSpecifier = ruleParts[1];
            const slaMatch = !sla || ruleParts.length < 3 || ruleParts[2] === sla;

            if(!resourceSpecifier || !slaMatch || !path || !path.startsWith("/")) {
                return false;
            }

            if(verb === "all") {
                // all HTML methods are allowed
            }
            else if(verb === "read" && method !== "GET") {
                return false;
            }
            else if(verb === "write" && method !== "PUT" && method !== "PATCH") {
                return false;
            }
            else if(verb === "delete" && method !== "DELETE") {
                return false;
            }

            const specifierParts = resourceSpecifier.split("/");
            const pathParts = path.startsWith("/events/") ? path.substring("/events".length).split("/") : path.split("/");
            if(resourceSpecifier.startsWith("/")) {
                if(specifierParts.length > pathParts.length) {
                    return false;
                }
                for(let i=0; i<specifierParts.length; i++) {
                    if(specifierParts[i] !== "*" && specifierParts[i] !== pathParts[i] && !pathParts[i].startsWith("{")) {
                        return false;
                    }
                }
                return true;
            }
            else {
                if(specifierParts.length > pathParts.length - 2 && specifierParts[pathParts.length - 2] !== "*") {
                    return false;
                }
                for(let i=0; i<specifierParts.length; i++) {
                    if(specifierParts[i] !== "*" && specifierParts[i] !== pathParts[i+2] && !pathParts[i+2].startsWith("{")) {
                        return false;
                    }
                }
                return true;
            }
        }

        const accessRule = Auth.getAccessRule();
        for(let i=0; i<accessRule.deny.length; i++) {
            if(isMatch(accessRule.deny[i])) {
                return false;
            }
        }
        for(let i=0; i<accessRule.allow.length; i++) {
            if(isMatch(accessRule.allow[i])) {
                return true;
            }
        }
        return false;
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

    static getCredentials() : Credentials|null {
        const lcCredentials = localStorage.getItem("credentials");
        if(!lcCredentials) {
            return null;
        }
        return JSON.parse(lcCredentials);
    }

    static getHeaders(): TempAny {
        let credentials = this.getCredentials();
        if(!credentials) {
            return {};
        }
        else {
            return { "Authorization": "Bearer " + credentials.token}
        }
    }

    static handle401Error(error:TempAny) {
        if(error.response && error.response.status === 401) {
            Auth.logout();
            window.location.href = "/ui/login?redirect=" + encodeURIComponent(window.location.pathname);
        }
    }

    static getAccessRule() : {allow:[allow:string],deny:[deny:string]} {
        const credentials = JSON.parse(localStorage.getItem("credentials") || "{}");
        const accessRule = credentials.accessRule || {};
        return {allow: accessRule.allow || ["all:*"], deny: accessRule.deny || []};
    }
}
