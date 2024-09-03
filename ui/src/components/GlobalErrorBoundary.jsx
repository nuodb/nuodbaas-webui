import React from "react";
import Button from '@mui/material/Button'

export default class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null, errorInfo: null };
    }

    componentDidCatch(error, errorInfo) {
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