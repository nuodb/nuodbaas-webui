// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import React, { ReactNode } from "react"
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import axios from "axios";
import Auth from "../../../utils/auth";
import { JsonType, RestLogEntry, RestMethodType } from "../../../utils/types";

let instance: RestSpinner | null = null;

interface State {
    pendingRequests: number,
    errorMessage?: string | null,
    isRecording: boolean,
}

const AUTOMATION_LOG = "automationLog";

export default class RestSpinner extends React.Component {
    state: State = {
        pendingRequests: 0,
        errorMessage: null,
        isRecording: false,
    }

    componentDidMount() {
        instance = this;
    }

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
        if (instance === null) {
            return;
        }
        instance.setState({ isRecording });
    }

    static isRecording() {
        if (instance === null) {
            return false;
        }
        return instance.state.isRecording;
    }

    static log(method: RestMethodType, url: string, success: boolean, body?: JsonType) {
        if (instance === null || !instance.state.isRecording) {
            return;
        }
        let automationLog = RestSpinner.getLog();
        automationLog.push({ timestamp: new Date().toISOString(), method, url, body, success });
        window.sessionStorage.setItem(AUTOMATION_LOG, JSON.stringify(automationLog));
    }

    static getLog(): RestLogEntry[] {
        const strAutomationLog = window.sessionStorage.getItem(AUTOMATION_LOG);
        return strAutomationLog ? JSON.parse(strAutomationLog) : [];
    }

    static clearLog() {
        window.sessionStorage.removeItem(AUTOMATION_LOG);
    }

    render(): ReactNode {
        return <React.Fragment>
            <Snackbar
                open={this.state.errorMessage !== null}
                autoHideDuration={5000}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
                message={this.state.errorMessage}
                onClose={() => this.setState({ errorMessage: null })}
            />
            {this.state.pendingRequests > 0 ?
                <CircularProgress color="inherit" size="1em" />
                :
                <div data-testid="rest_spinner__complete">&nbsp;</div>
            }
        </React.Fragment>;
    }

    static async get(path: string) {
        return new Promise((resolve, reject) => {
            RestSpinner.incrementPending();
            const url = Auth.getNuodbCpRestUrl(path);
            axios.get(url, { headers: Auth.getHeaders() })
                .then(response => {
                    RestSpinner.log("get", url, true);
                    resolve(response.data);
                }).catch(reason => {
                    RestSpinner.log("get", url, false);
                    reject(reason);
                }).finally(() => {
                    RestSpinner.decrementPending();
                })
        })
    }

    static async getStream(path: string, eventsAbortController: AbortController) {
        return new Promise((resolve, reject) => {
            RestSpinner.incrementPending();
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
                    RestSpinner.log("get", url, true);
                    resolve(response.data);
                }).catch(reason => {
                    RestSpinner.log("get", url, false);
                    reject(reason);
                }).finally(() => {
                    RestSpinner.decrementPending();
                })
        })
    }

    static async put(path: string, data: JsonType) {
        return new Promise((resolve, reject) => {
            RestSpinner.incrementPending();
            const url = Auth.getNuodbCpRestUrl(path);
            axios.put(url, data, { headers: Auth.getHeaders() })
                .then(response => {
                    RestSpinner.log("put", url, true, data);
                    resolve(response.data);
                }).catch(error => {
                    RestSpinner.log("put", url, false, data);
                    return reject(error);
                }).finally(() => {
                    RestSpinner.decrementPending();
                })
        });
    }

    static async delete(path: string) {
        return new Promise((resolve, reject) => {
            RestSpinner.incrementPending();
            const url = Auth.getNuodbCpRestUrl(path);
            axios.delete(url, { headers: Auth.getHeaders() })
                .then(response => {
                    RestSpinner.log("delete", url, true);
                    resolve(response.data);
                }).catch(reason => {
                    RestSpinner.log("delete", url, false);
                    reject(reason);
                }).finally(() => {
                    RestSpinner.decrementPending();
                })
        });
    }

    static async patch(path: string, data: JsonType) {
        return new Promise((resolve, reject) => {
            RestSpinner.incrementPending();
            const url = Auth.getNuodbCpRestUrl(path);
            axios.patch(url, data, { headers: { ...Auth.getHeaders(), "Content-Type": "application/json-patch+json" } })
                .then(response => {
                    RestSpinner.log("patch", url, true, data);
                    resolve(response.data);
                }).catch(error => {
                    RestSpinner.log("patch", url, false, data);
                    reject(error);
                }).finally(() => {
                    RestSpinner.decrementPending();
                })
        });
    }
}