import React from "react"
import CircularProgress from '@mui/material/CircularProgress';
import axios from "axios";
import Auth from "../../../utils/auth";

let instance = null;

export default class RestSpinner extends React.Component {
    state = {
        pendingRequests: 0
    }

    componentDidMount() {
        instance = this;
    }

    static incrementPending() {
        if(instance === null) {
            return;
        }

        instance.setState((prevState) => {
            return {pendingRequests: prevState.pendingRequests + 1};
        });
    }

    static decrementPending() {
        if(instance === null) {
            return;
        }

        instance.setState((prevState) => {
            return {pendingRequests: prevState.pendingRequests - 1};
        });
    }

    render() {
        if(this.state.pendingRequests > 0) {
            return <CircularProgress color="inherit" size="1em" />;
        }
        else {
            return <div data-testid="rest_spinner__complete">&nbsp;</div>;
        }
    }

    static async get(path) {
        return new Promise((resolve, reject) => {
            RestSpinner.incrementPending();
            axios.get(Auth.getNuodbCpRestUrl() + path, { headers: Auth.getHeaders() })
                .then(response => {
                    RestSpinner.decrementPending();
                    resolve(response.data);
                }).catch(reason => {
                    RestSpinner.decrementPending();
                    reject(reason);
                })
        })
    }

    static async getStream(path, eventsAbortController) {
        return new Promise((resolve, reject) => {
            RestSpinner.incrementPending();
            axios({
                headers: {...Auth.getHeaders(), 'Accept': 'text/event-stream'},
                method: 'get',
                url: Auth.getNuodbCpRestUrl() + path,
                responseType: 'stream',
                adapter: 'fetch',
                signal: eventsAbortController.signal
              })
              .then(async response => {
                RestSpinner.decrementPending();
                resolve(response.data);
              }).catch(reason => {
                RestSpinner.decrementPending();
                reject(reason);
              })
        })
    }

    static async put(path, data) {
        return new Promise((resolve, reject) => {
            RestSpinner.incrementPending();
            axios.put(Auth.getNuodbCpRestUrl() + path, data, { headers: Auth.getHeaders() })
                .then(response => {
                    RestSpinner.decrementPending();
                    resolve(response.data);
                }).catch(error => {
                    RestSpinner.decrementPending();
                    return reject(error)})
        });
    }

    static async delete(path) {
        return new Promise((resolve, reject) => {
            RestSpinner.incrementPending();
            axios.delete(Auth.getNuodbCpRestUrl() + path, { headers: Auth.getHeaders() })
                .then(response => {
                    RestSpinner.decrementPending();
                    resolve(response.data);
                }).catch(reason => {
                    RestSpinner.decrementPending();
                    reject(reason);
                });
            });
    }

    static async patch(path, data) {
        return new Promise((resolve, reject) => {
            RestSpinner.incrementPending();
            axios.patch(Auth.getNuodbCpRestUrl() + path, data, { headers: {...Auth.getHeaders(), "Content-Type": "application/json-patch+json"} })
                .then(response => {
                    RestSpinner.decrementPending();
                    resolve(response.data);
                })
                .catch(error => {
                    RestSpinner.decrementPending();
                    reject(error);
                });
        });
    }
}