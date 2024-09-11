// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { getValue } from "./utils"
import FieldBase from "./FieldBase"

export default class FieldHidden extends FieldBase {
    /**
     * show Field of type String using the values and schema definition
     * @returns
     */
    show() {
        const { prefix, values } = this.props;
        let value = getValue(values, prefix);
        if (value === null) {
            return null;
        }
        return <input key={prefix} type="hidden" id={prefix} name={prefix} value={String(value)} />
    }
}