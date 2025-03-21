// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React, { Component } from 'react';

let s_instance: Toast | null = null;

interface IProps { }

interface IState {
    messages?: string[]
}

export default class Toast extends Component<IProps, IState> {
    state = {
        messages: []
    }

    componentDidMount() {
        s_instance = this;
    }

    static show = (msg: string, error: any) => {
        if (error?.response?.data?.detail) {
            msg += "\n" + error.response.data.detail;
        }
        else {
            console.log("Toast", msg, error);
        }
        s_instance && s_instance.setState({
            messages: [...s_instance.state.messages, msg]
        });
        setTimeout(() => {
            if (s_instance) {
                let messages = s_instance.state.messages.slice(1);
                s_instance.setState({ messages });
            }
        }, 5000);
    }

    render() {
        return <div className="NuoToast" role="alert">{this.state.messages.map((message: string, index: number) => <div key={index}>{message.split("\n").map((line, idx) => <div key={idx}>{line}</div>)}</div>)}</div>
    }
}