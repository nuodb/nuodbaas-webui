import React from "react";
import { getValue } from "./utils"
import FieldBase from "./FieldBase"

export default class FieldHidden extends FieldBase {
    /**
     * show Field of type String using the values and schema definition
     * @param prefix - contains field name (hierarchical fields are separated by period)
     * @param values - contains object with ALL values (and field names) of this form (not just this field).
     *                 the key is the field name (name is separated by period if the field is hierarchical)
     * @returns
     */
    show() {
        const { prefix, values } = this.props;
        let value = getValue(values, prefix);
        if (value === null) {
            return null;
        }
        return <input type="hidden" id={prefix} name={prefix} value={String(value)} />
    }
}