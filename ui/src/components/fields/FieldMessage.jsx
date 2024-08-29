import React from "react";
import FieldBase from "./FieldBase"

export default class FieldMessage extends FieldBase {

    /**
     * show message (as a Field type)
     * @returns
     */
    show() {
        return <h1 key={this.props.prefix}>{this.props.message}</h1>;
    }
}