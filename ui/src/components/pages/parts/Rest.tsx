// (C) Copyright 2025-2026 Dassault Systemes SE.  All Rights Reserved.

import React, { ReactNode } from "react"
import CircularProgress from '@mui/material/CircularProgress';
import axios from "axios";
import Auth from "../../../utils/auth";
import { JsonType, RestLogEntry, RestMethodType } from "../../../utils/types";

let instance: Rest | null = null;

interface State {
    pendingRequests: number,
}

const AUTOMATION_LOG = "nuodbaas-webui-recorded";
export const NUODBAAS_WEBUI_ISRECORDING = "nuodbaas-webui-isRecording";

type CacheValueType = {
    timeout: number,
    value: any,
    status: "pending" | "done",
    pendingRequests: (() => Promise<any>)[]
};

export class Rest extends React.Component<{ isRecording: boolean, setIsRecording: (isRecording: boolean) => void }> {
    state: State = {
        pendingRequests: 0,
    }

    // cache for getCache() operations with timeout
    static CACHE_TIMEOUT = 60 * 1000;
    static cache: Map<string, CacheValueType> = new Map<string, any>();

    componentDidMount() {
        if (!instance) {
            instance = this;
        }
    }

    lastTimestamp = new Date();

    static incrementPending() {
        if (instance === null) {
            return;
        }

        instance.setState((prevState: State) => {
            return { pendingRequests: prevState.pendingRequests + 1 };
        });
    }

    static decrementPending() {
        if (instance === null) {
            return;
        }

        instance.setState((prevState: State) => {
            return { pendingRequests: prevState.pendingRequests > 0 ? prevState.pendingRequests - 1 : 0 };
        });
    }

    static setIsRecording(isRecording: boolean) {
        if (!instance || !instance.props.setIsRecording) {
            return;
        }
        instance.props.setIsRecording(isRecording);
        if (isRecording) {
            sessionStorage.setItem(NUODBAAS_WEBUI_ISRECORDING, "true");
        }
        else {
            sessionStorage.removeItem(NUODBAAS_WEBUI_ISRECORDING);
        }
    }

    static isRecording() {
        if (instance === null) {
            return false;
        }
        return instance.props.isRecording;
    }

    static log(method: RestMethodType, url: string, success: boolean, body?: JsonType) {
        if (instance === null || !instance.props.isRecording) {
            return;
        }
        let automationLog = Rest.getLog();
        const now = new Date();
        if (now <= instance.lastTimestamp) {
            instance.lastTimestamp = new Date(instance.lastTimestamp.getTime() + 1)
        }
        else {
            instance.lastTimestamp = now;
        }
        automationLog.push({ timestamp: instance.lastTimestamp.toISOString(), method, url, body, success });
        window.sessionStorage.setItem(AUTOMATION_LOG, JSON.stringify(automationLog));
    }

    static getLog(): RestLogEntry[] {
        const strAutomationLog = sessionStorage.getItem(AUTOMATION_LOG);
        return strAutomationLog ? JSON.parse(strAutomationLog) : [];
    }

    static clearLog() {
        window.sessionStorage.removeItem(AUTOMATION_LOG);
    }

    render(): ReactNode {
        return this.state.pendingRequests > 0 ?
            <CircularProgress className="RestSpinner" color="inherit" />
            :
            <div data-testid="rest_spinner__complete" className="RestSpinner">&nbsp;</div>;
    }

    static async get(path: string) {
        return new Promise((resolve, reject) => {
            Rest.incrementPending();
            const url = Auth.getNuodbCpRestUrl(path);
            axios.get(url, { headers: Auth.getHeaders() })
                .then(response => {
                    Rest.log("get", url, true);
                    resolve(response.data);
                }).catch(async reason => {
                    if (!await Rest.process401(reason)) {
                        Rest.log("get", url, false);
                        reject(reason);
                    }
                }).finally(() => {
                    Rest.decrementPending();
                })
        })
    }

    static deleteCacheEntry(path: string) {
        const entry = this.cache.get(path);
        if (entry && entry.status === "done") {
            this.cache.delete(path);
        }
    }

    static async getWithCache(path: string) {
        //clean out old entries
        const now = Date.now();
        [...this.cache.keys()].forEach(key => {
            const entry = this.cache.get(key);
            if (entry && entry.timeout < now) {
                this.cache.delete(key);
            }
        });

        let entry = this.cache.get(path);
        if (entry) {
            if (entry.status === "done") {
                return Promise.resolve(entry.value);
            }
            else {
                entry.pendingRequests.push(() => {
                    return Promise.resolve(entry?.value);
                });
            }
        }
        else {
            let data: CacheValueType = { timeout: now + this.CACHE_TIMEOUT, value: undefined, status: "pending", pendingRequests: [] };
            this.cache.set(path, data);
            let entry = await this.get(path);
            data.value = entry;
            for (let i = 0; i < data.pendingRequests.length; i++) {
                await data.pendingRequests[i]();
            }
            data.pendingRequests = [];
            data.status = "done"; //keep this after the "pendingRequests"
            return entry;
        }
    }

    static async getStream(url: string, headers: { [key: string]: string }, eventsAbortController: AbortController) {
        return new Promise((resolve, reject) => {
            Rest.incrementPending();
            axios({
                headers: { ...headers, 'Accept': 'text/event-stream' },
                method: 'get',
                url: url,
                responseType: 'stream',
                adapter: 'fetch',
                signal: eventsAbortController.signal
            })
                .then(async response => {
                    Rest.log("get", url, true);
                    resolve(response.data);
                }).catch(async reason => {
                    if (!await Rest.process401(reason)) {
                        Rest.log("get", url, false);
                        reject(reason);
                    }
                }).finally(() => {
                    Rest.decrementPending();
                })
        })
    }

    static async put(path: string, data: JsonType) {
        this.cache.delete(path);

        return new Promise((resolve, reject) => {
            Rest.incrementPending();
            const url = Auth.getNuodbCpRestUrl(path);
            axios.put(url, data, { headers: Auth.getHeaders() })
                .then(response => {
                    Rest.log("put", url, true, data);
                    resolve(response.data);
                }).catch(async error => {
                    if (!await Rest.process401(error)) {
                        Rest.log("put", url, false, data);
                        reject(error);
                    }
                }).finally(() => {
                    Rest.decrementPending();
                })
        });
    }

    static async post(path: string, data: JsonType) {
        this.cache.delete(path);

        return new Promise((resolve, reject) => {
            Rest.incrementPending();
            const url = Auth.getNuodbCpRestUrl(path);
            axios.post(url, data, { headers: Auth.getHeaders() })
                .then(response => {
                    Rest.log("post", url, true, data);
                    resolve(response.data);
                }).catch(async error => {
                    if (!await Rest.process401(error)) {
                        Rest.log("post", url, false, data);
                        reject(error);
                    }
                }).finally(() => {
                    Rest.decrementPending();
                })
        });
    }

    static async delete(path: string) {
        this.cache.delete(path);

        return new Promise((resolve, reject) => {
            Rest.incrementPending();
            const url = Auth.getNuodbCpRestUrl(path);
            axios.delete(url, { headers: Auth.getHeaders() })
                .then(response => {
                    Rest.log("delete", url, true);
                    resolve(response.data);
                }).catch(async reason => {
                    if (!await Rest.process401(reason)) {
                        Rest.log("delete", url, false);
                        reject(reason);
                    }
                }).finally(() => {
                    Rest.decrementPending();
                })
        });
    }

    static async patch(path: string, data: JsonType) {
        this.cache.delete(path);

        return new Promise((resolve, reject) => {
            Rest.incrementPending();
            const url = Auth.getNuodbCpRestUrl(path);
            axios.patch(url, data, { headers: { ...Auth.getHeaders(), "Content-Type": "application/json-patch+json" } })
                .then(response => {
                    Rest.log("patch", url, true, data);
                    resolve(response.data);
                }).catch(async error => {
                    if (!await Rest.process401(error)) {
                        Rest.log("patch", url, false, data);
                        reject(error);
                    }
                }).finally(() => {
                    Rest.decrementPending();
                })
        });
    }

    // check if the error is caused by a 401 and force a re-login.
    // note that the user might not have access to some resources (resulting in a 401), so we
    // check if the user has at least access to the "/api/openapi" spec.
    static async process401(error: any): Promise<boolean> {
        if (error.response.status === 401) {
            if (Auth.getCredentials()?.username) {
                axios.get(Auth.getNuodbCpRestUrl("/openapi"), { headers: Auth.getHeaders() }).catch(error2 => {
                    if (error2.response.status === 401) {
                        Auth.logout();
                        window.location.href = "/ui/login?redirect=" + encodeURIComponent(window.location.href);
                        return true;
                    }
                });
            }
        }
        return false;
    }
}
