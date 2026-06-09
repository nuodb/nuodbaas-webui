// (C) Copyright 2025-2026 Dassault Systemes SE.  All Rights Reserved.

import React, { Component } from "react";

let s_instance: Toast | null = null;

interface IState {
  messages?: string[];
}

export default class Toast extends Component<
  Record<string, undefined>,
  IState
> {
  state = {
    messages: [],
  };

  componentDidMount() {
    s_instance = this;
  }

  static async show(msg: string, error: any) {
    let data = error?.response?.data;
    if (data instanceof ReadableStream) {
      const text = await new Response(error.response.data).text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { detail: text };
      }
    }
    if (data?.detail) {
      msg += "\n" + data.detail;
    } else {
      console.log("Toast", msg, error);
    }
    s_instance?.setState({
      messages: [...s_instance.state.messages, msg],
    });
    setTimeout(() => {
      if (s_instance) {
        const messages = s_instance.state.messages.slice(1);
        s_instance.setState({ messages });
      }
    }, 5000);
  }

  render() {
    return (
      <div className="NuoToast" role="alert">
        {this.state.messages.map((message: string, index: number) => (
          <div key={index}>
            {message.split("\n").map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
          </div>
        ))}
      </div>
    );
  }
}
