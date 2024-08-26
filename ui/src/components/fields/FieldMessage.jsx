import React from "react";

export default class FieldMessage {
    constructor(props) {
        this.props = props;
    }

    /**
     * show message (as a Field type)
     * @returns
     */
    show() {
        return <h1>{this.props.message}</h1>;
    }
}