// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import React, { ErrorInfo, ReactNode } from "react";
import Button from '@mui/material/Button'

interface IProps {
    children?: ReactNode
}

interface IState {
    error: Error | null,
    errorInfo: ErrorInfo | null
}

export default class GlobalErrorBoundary extends React.Component<IProps, IState> {
    constructor(props: IProps) {
        super(props);
        this.state = { error: null, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.error || this.state.errorInfo) {
            return (
                <React.Fragment>
                    <h2>Error occurred</h2>
                    {this.state.error && this.state.error.toString()}
                    <br />
                    <h3>Stack</h3>
                    <div style={{ whiteSpace: "pre-wrap" }}>
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </div>
                    <br />
                    <Button variant="contained" onClick={() => {
                        window.location.href = "/ui";
                    }}>Dismiss</Button>

                </React.Fragment>
            );
        }

        return this.props.children;
    }
}