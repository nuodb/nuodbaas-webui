import React from "react";
import FieldBase from "./FieldBase"

export default class FieldMessage extends FieldBase {

    /**
     * show message (as a Field type)
     * @returns
     */
    show() {
        return <h1>{this.props.message}</h1>;
    }
}