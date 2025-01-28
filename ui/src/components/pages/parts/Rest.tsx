// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React, { ReactNode } from "react"
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import axios from "axios";
import Auth from "../../../utils/auth";
import { JsonType, RestLogEntry, RestMethodType } from "../../../utils/types";

let instance: Rest | null = null;

interface State {
    pendingRequests: number,
    errorMessage?: string | null,
}

const AUTOMATION_LOG = "nuodbaas-webui-recorded";
export const NUODBAAS_WEBUI_ISRECORDING = "nuodbaas-webui-isRecording";

export class Rest extends React.Component<{ isRecording: boolean, setIsRecording: (isRecording: boolean) => void }> {
    state: State = {
        pendingRequests: 0,
        errorMessage: null,
    }

    componentDidMount() {
        if (!instance) {
            instance = this;
        }
    }

    lastTimestamp = new Date();

    static toastError(msg: string, error: string) {
        instance && instance.setState({ errorMessage: msg });
        console.log(msg, error);
    }

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
            return { pendingRequests: prevState.pendingRequests - 1 };
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
        return null;
    }

    static async get(path: string) {
        return new Promise((resolve, reject) => {
            Rest.incrementPending();
            const url = Auth.getNuodbCpRestUrl(path);
            axios.get(url, { headers: Auth.getHeaders() })
                .then(response => {
                    Rest.log("get", url, true);
                    resolve(response.data);
                }).catch(reason => {
                    Rest.log("get", url, false);
                    reject(reason);
                }).finally(() => {
                    Rest.decrementPending();
                })
        })
    }

    static async getStream(path: string, eventsAbortController: AbortController) {
        return new Promise((resolve, reject) => {
            Rest.incrementPending();
            const url = Auth.getNuodbCpRestUrl(path);
            axios({
                headers: { ...Auth.getHeaders(), 'Accept': 'text/event-stream' },
                method: 'get',
                url: url,
                responseType: 'stream',
                adapter: 'fetch',
                signal: eventsAbortController.signal
            })
                .then(async response => {
                    Rest.log("get", url, true);
                    resolve(response.data);
                }).catch(reason => {
                    Rest.log("get", url, false);
                    reject(reason);
                }).finally(() => {
                    Rest.decrementPending();
                })
        })
    }

    static async put(path: string, data: JsonType) {
        return new Promise((resolve, reject) => {
            Rest.incrementPending();
            const url = Auth.getNuodbCpRestUrl(path);
            axios.put(url, data, { headers: Auth.getHeaders() })
                .then(response => {
                    Rest.log("put", url, true, data);
                    resolve(response.data);
                }).catch(error => {
                    Rest.log("put", url, false, data);
                    return reject(error);
                }).finally(() => {
                    Rest.decrementPending();
                })
        });
    }

    static async delete(path: string) {
        return new Promise((resolve, reject) => {
            Rest.incrementPending();
            const url = Auth.getNuodbCpRestUrl(path);
            axios.delete(url, { headers: Auth.getHeaders() })
                .then(response => {
                    Rest.log("delete", url, true);
                    resolve(response.data);
                }).catch(reason => {
                    Rest.log("delete", url, false);
                    reject(reason);
                }).finally(() => {
                    Rest.decrementPending();
                })
        });
    }

    static async patch(path: string, data: JsonType) {
        return new Promise((resolve, reject) => {
            Rest.incrementPending();
            const url = Auth.getNuodbCpRestUrl(path);
            axios.patch(url, data, { headers: { ...Auth.getHeaders(), "Content-Type": "application/json-patch+json" } })
                .then(response => {
                    Rest.log("patch", url, true, data);
                    resolve(response.data);
                }).catch(error => {
                    Rest.log("patch", url, false, data);
                    reject(error);
                }).finally(() => {
                    Rest.decrementPending();
                })
        });
    }
}

export function RestSpinner() {
    if (!instance) return null;

    return <React.Fragment>
        <Snackbar
            open={instance.state.errorMessage !== null}
            autoHideDuration={5000}
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
            message={instance.state.errorMessage}
            onClose={() => instance?.setState({ errorMessage: null })}
        />
        {instance.state.pendingRequests > 0 ?
            <CircularProgress color="inherit" size="1em" />
            :
            <div data-testid="rest_spinner__complete">&nbsp;</div>
        }
    </React.Fragment>;
}