// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { FieldValuesType, TempAny } from "../../utils/types";

/**
 * gets a value from a field. If not found, returns null.
 * @param {*} values object containing possibly hierarchical fields
 * @param {*} prefix field name. Hierarchical fields are separated by a period.
 * @returns null if value is not found
 */
export function getValue(values: FieldValuesType, prefix: string): TempAny {
    let value = values;
    const parts = prefix.split(".");
    for(let i=0; i<parts.length; i++) {
        value = value[parts[i]];
        if(value === undefined || value === null) {
            return null;
        }
    }
    if(value === undefined) {
        return null;
    }
    return value;
}

/**
 * sets a field value. Removes field if value is null or undefined.
 * @param {*} values object containing possibly hierarchical fields
 * @param {*} prefix field name. Hierarchical fields are separated by a period.
 * @param {*} value value to assign. Deletes field if value is undefined or null.
 */
export function setValue(values:FieldValuesType, prefix:string, value?:TempAny) {
    const parts = prefix.split(".");
    let values_ = values;
    for(let i=0; i<parts.length-1; i++) {
        if(!values_[parts[i]]) {
            if(value === null || value === undefined) {
                return;
            }
            values_[parts[i]] = {};
        }
        values_ = values_[parts[i]];
    }

    const lastPart = parts[parts.length-1];
    if(value === null || value === undefined) {
        const index = parseInt(lastPart);
        if(lastPart === "" || isNaN(index)) {
            // remove object property
            delete values_[parts[parts.length-1]];
        }
        else {
            // remove array element
            values_.splice(index, 1);
        }
    }
    else {
        values_[lastPart] = value;
    }
}
