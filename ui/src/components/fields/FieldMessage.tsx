// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.
import React, { ReactNode } from "react";
import FieldBase from "./FieldBase"

export default class FieldMessage extends FieldBase {

    /**
     * show message (as a Field type)
     * @returns
     */
    show(): ReactNode {
        const { prefix, parameter } = this.props;
        console.log("ERROR: Invalid object", prefix, parameter);
        if (process && process.env && process.env.NODE_ENV === "development") {
            return <h1 key={this.props.prefix}>{this.props.message}</h1>;
        }
        else {
            return null;
        }
    }
}