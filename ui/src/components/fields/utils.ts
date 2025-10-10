// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import { FieldValuesType, TempAny } from "../../utils/types";

/**
 * gets a value from a field. If not found, returns null.
 * @param {*} values object containing possibly hierarchical fields
 * @param {*} prefix field name. Hierarchical fields are separated by a period.
 * @returns null if value is not found
 */
export function getValue(values: FieldValuesType, prefix: string): TempAny {
    let start = 0;
    while(true) {
        let posPeriod = prefix.indexOf(".", start);
        if(posPeriod === -1) {
            posPeriod = prefix.length;
        }
        const childValue = values[prefix.substring(0, posPeriod)];
        if(posPeriod === prefix.length) {
            if(childValue === undefined) {
                return null;
            }
            return childValue;
        }
        else if(childValue !== undefined) {
            return getValue(childValue, prefix.substring(posPeriod+1));
        }

        start = posPeriod + 1;
    }
}

function deletePrefix(values:FieldValuesType, prefix:string) {
    const index = parseInt(prefix);
    if(isNaN(index)) {
        // remove object property
        delete values[prefix];
    }
    else {
        // remove array element
        values.splice(index, 1);
    }
}

/**
 * sets a field value. Removes field if value is null or undefined.
 * @param {*} values object containing possibly hierarchical fields
 * @param {*} prefix field name. Hierarchical fields are separated by a period.
 * @param {*} value value to assign. Deletes field if value is undefined or null.
 */
export function setValue(values:FieldValuesType, prefix:string, value?:TempAny) {
    const keys = Object.keys(values);
    for(let i=0; i<keys.length; i++) {
        if(keys[i] === prefix) {
            if(value === undefined || value === null) {
                deletePrefix(values, keys[i]);
            }
            else {
                values[keys[i]] = value;
            }
            return;
        }
        if(prefix.startsWith(keys[i] + ".")) {
            setValue(values[keys[i]], prefix.substring(keys[i].length+1), value);
            return;
        }
    }
    let posPeriod = prefix.indexOf(".");
    if(posPeriod === -1) {
        if(value === null || value === undefined) {
            deletePrefix(values, prefix);
        }
        else {
            values[prefix] = value;
        }
    }
    else {
        const parts = prefix.split(".");
        if(isNaN(Number(parts[1]))) {
            values[parts[0]] = {};
        }
        else {
            values[parts[0]] = [];
        }
        setValue(values[parts[0]], prefix.substring(prefix.indexOf(".")+1), value);
    }
}
