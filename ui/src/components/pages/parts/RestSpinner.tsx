// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import React, { ReactNode } from "react"
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import axios from "axios";
import Auth from "../../../utils/auth";
import { TempAny } from "../../../utils/types";

let instance: RestSpinner | null = null;

interface State {
    pendingRequests: number,
    errorMessage?: string | null
}

export default class RestSpinner extends React.Component {
    state: State = {
        pendingRequests: 0,
        errorMessage: null
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
            axios.get(Auth.getNuodbCpRestUrl(path), { headers: Auth.getHeaders() })
                .then(response => {
                    resolve(response.data);
                }).catch(reason => {
                    reject(reason);
                }).finally(() => {
                    RestSpinner.decrementPending();
                })
        })
    }

    static async getStream(path: string, eventsAbortController: TempAny) {
        return new Promise((resolve, reject) => {
            RestSpinner.incrementPending();
            axios({
                headers: { ...Auth.getHeaders(), 'Accept': 'text/event-stream' },
                method: 'get',
                url: Auth.getNuodbCpRestUrl(path),
                responseType: 'stream',
                adapter: 'fetch',
                signal: eventsAbortController.signal
            })
                .then(async response => {
                    resolve(response.data);
                }).catch(reason => {
                    reject(reason);
                }).finally(() => {
                    RestSpinner.decrementPending();
                })
        })
    }

    static async put(path: string, data: TempAny) {
        return new Promise((resolve, reject) => {
            RestSpinner.incrementPending();
            axios.put(Auth.getNuodbCpRestUrl(path), data, { headers: Auth.getHeaders() })
                .then(response => {
                    resolve(response.data);
                }).catch(error => {
                    return reject(error);
                }).finally(() => {
                    RestSpinner.decrementPending();
                })
        });
    }

    static async delete(path: string) {
        return new Promise((resolve, reject) => {
            RestSpinner.incrementPending();
            axios.delete(Auth.getNuodbCpRestUrl(path), { headers: Auth.getHeaders() })
                .then(response => {
                    resolve(response.data);
                }).catch(reason => {
                    reject(reason);
                }).finally(() => {
                    RestSpinner.decrementPending();
                })
        });
    }

    static async patch(path: string, data: TempAny) {
        return new Promise((resolve, reject) => {
            RestSpinner.incrementPending();
            axios.patch(Auth.getNuodbCpRestUrl(path), data, { headers: { ...Auth.getHeaders(), "Content-Type": "application/json-patch+json" } })
                .then(response => {
                    resolve(response.data);
                }).catch(error => {
                    reject(error);
                }).finally(() => {
                    RestSpinner.decrementPending();
                })
        });
    }
}