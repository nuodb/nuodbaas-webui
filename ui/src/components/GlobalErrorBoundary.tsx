// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import React, { ErrorInfo, ReactNode } from "react";
import Button from "./controls/Button";
import Stacktrace from 'stacktrace-js';
import BuildNumber from "./pages/parts/BuildNumber";
import { t } from "i18next";

interface IProps {
    children?: ReactNode
}

interface IState {
    error: Error | null,
    errorInfo: ErrorInfo | null
    stack?: string | null
}

export default class GlobalErrorBoundary extends React.Component<IProps, IState> {
    constructor(props: IProps) {
        super(props);
        this.state = { error: null, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({ error, errorInfo, stack: this.state.errorInfo && this.state.errorInfo.componentStack });
        Stacktrace.fromError(error).then(stackArray => {
            let stack = "";
            stackArray.forEach(s => {
                const parts = s.fileName?.split("/");
                const filename = parts && parts[parts.length - 1];
                stack += " at " + s.functionName + " " + filename + ":" + s.lineNumber + "\n";
            })
            this.setState({ stack });
        })
    }

    render() {
        if (this.state.error || this.state.errorInfo) {
            return (
                <div className="ErrorPage">
                    <label>Error occurred</label>
                    {this.state.error && this.state.error.toString()}
                    <label>Stack</label>
                    {this.state.stack}
                    <label>Build</label>
                    <BuildNumber />
                    <br />
                    <Button onClick={() => {
                        window.location.href = "/ui";
                    }}>{t("button.dismiss")}</Button>
                </div>
            );
        }

        return this.props.children;
    }
}