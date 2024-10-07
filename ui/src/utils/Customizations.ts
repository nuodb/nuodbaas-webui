// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import axios from "axios";
import { TempAny } from "./types";
import { getValue } from "../components/fields/utils";
import { matchesPath } from "./schema";

export const LOCAL_USER_SETTINGS = "nuodbaas_webui_userSettings";

export type CustomFormField = {
    required: boolean,
    expand: boolean,
    hidden: boolean
}

export type CustomFormSection = {
    title: string,
    fields: {
        [key: string]:CustomFormField
    }
}

export type CustomForms = {[key: string]:{
    sections: [
        CustomFormSection
    ],
}};

export type CustomViewField = {
    label: string;
    value: string,
    buttons: [
        label: string,
        patch: any,
        visible: string,
        confirm: string
    ]
};

export type CustomViewFields = {[key:string]:CustomViewField}

export type CustomView = {
    columns?: string[],
    fields?: CustomViewFields
};

export type CustomViews = {[key: string]: CustomView}

export type CustomType = {
    theme?: string,
    forms?: CustomForms,
    views?: CustomViews,
};

let custom : CustomType = {};
let customInitialized = false;

/**
 * Returns a structure of customizations. It is a combination of the default customizations and user's customization
 * The user customizations are stored in the Browser's local storage.
 * @returns
 */
export function getCustomizations() : CustomType {
    if(!customInitialized) {
        axios.get("/ui/customizations.json").then(response => {
            custom = response.data;
            customInitialized = true;
        })
    }

    const userSettings = localStorage.getItem(LOCAL_USER_SETTINGS);
    if(userSettings) {
        try {
            let merged = JSON.parse(JSON.stringify(custom));
            mergeRecursive(merged, JSON.parse(userSettings));
            return merged;
        }
        catch(ex) {
            console.log("Unable to apply user settings: " + ex);
        }
    }

    return custom;
};

/**
 * Returns customization info for the specified view
 * @param path
 * @returns
 */
export function getCustomizationsView(path: string) : CustomView | null {
    const views : CustomViews | undefined = getCustomizations()?.views;
    if(views) {
        for (const sPath of Object.keys(views)) {
            if (matchesPath(path, sPath)) {
                return views[sPath];
            }
        }
    }
    return null;
}

function isAlpha(ch: string) {
    return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z");
}

function isNumericOrPeriod(ch: string) {
    return (ch >= "0" && ch <= "9") || (ch === ".");
}

/** Splits the formula into the appropriate components as an Array. Each array element has a string representing a name or operator
 * This simplifies processing when passing in the data.
 */
function splitFormulaIntoParts(formula: string) : string[]|null {
    let name = "";
    let ret = [];

    function pushElement(element:string) {
        if(name !== "") {
            ret.push(name);
            name = "";
        }
        ret.push(element);
    }

    while(formula !== "") {
        const ch = formula.charAt(0);
        formula = formula.substring(1);
        if(ch === " ") {
            continue;
        }
        else if(ch === "!") {
            pushElement(ch);
        }
        else if("=&|".includes(ch)) {
            if(formula.length > 0 && formula[0] === ch) {
                formula = formula.substring(1);
            }
            pushElement(ch);
        }
        else if(isAlpha(ch) || (name !== "" && !name.endsWith(".") && isNumericOrPeriod(ch))) {
            name += ch;
        }
        else {
            //invalid
            return null;
        }
    }
    if(name !== "") {
        ret.push(name);
    }
    return ret;
}

type FormulaPart = (boolean|string|FormulaPart[])

/**
 * Processes the formula by calculating the result from the data set
 * Note: This method is implemented because JavaScripts eval() is a security risk
 * and we should only process intended calculations. It will be expanded on a "need" basis.
 * @param data object containing a row of data
 * @param parts formula split into their various components
 * @returns result
 */
function handleFormula(data: TempAny, parts: FormulaPart[]) : FormulaPart {
    for(let i=0; i<parts.length; i++) {
        if(Array.isArray(parts[i])) {
            parts[i] = handleFormula(data, parts[i] as FormulaPart[]);
        }
    }
    if(parts.length === 1) {
        if(typeof parts[0] === "string" && isAlpha(parts[0].charAt(0))) {
            return getValue(data, parts[0]);
        }
        else if(typeof parts[0] === "boolean") {
            return parts[0];
        }
    }
    if(parts.length === 2 && parts[0] === "!" && (typeof parts[1] === "string")) {
        return !getValue(data, parts[1]);
    }
    else if(parts.length === 3 && parts[1] === "&") {
        return parts[0] && parts[2];
    }
    else if(parts.length === 3 && parts[1] === "|") {
        return parts[0] || parts[2];
    }
    else if(parts.length === 3 && parts[1] === "=") {
        return parts[0] === parts[2];
    }
    else {
        console.log("ERROR: invalid formula", parts);
        return "";
    }
}

/**
 * Evaluate the formula based on the provided data set
 * @param data
 * @param formula
 * @returns
 */
export function evaluate(data: TempAny, formula: string) : TempAny {
    let parts = splitFormulaIntoParts(formula);
    if(parts === null) {
        console.log("invalid formula: " + formula);
        return "";
    }
    const ret = handleFormula(data, parts);
    return ret;
}

/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
function isObject(item: any):boolean {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Deep merge two objects.
 * @param merged object where data is merged into
 * @param data object to apply to the merged object
 */
function mergeRecursive(merged: any, data: any) : any {
    for (const key in data) {
        if (isObject(data[key])) {
            if (!merged[key]) {
                merged[key] = {};
            }
            mergeRecursive(merged[key], data[key]);
        } else {
            merged[key] = data[key];
        }
    }
}