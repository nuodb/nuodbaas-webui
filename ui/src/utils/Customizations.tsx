// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import axios from "axios";
import { TempAny } from "./types";
import { getValue } from "../components/fields/utils";
import { matchesPath } from "./schema";
import React, { useEffect, useState } from "react";

export const LOCAL_USER_SETTINGS = "nuodbaas_webui_userSettings";

export type CustomFormField = {
    required: boolean,
    expand: boolean,
    hidden: boolean
}

export type CustomFormSection = {
    title: string,
    fields: {
        [key: string]: CustomFormField
    }
}

export type CustomForms = {
    [key: string]: {
        sections: [
            CustomFormSection
        ],
    }
};

export type CustomViewField = {
    label: string,
    value: string,
};

export type CustomViewMenu = {
    label: string,
    patch: any,
    visible: string,
    confirm: string,
};

export type CustomViewFields = { [key: string]: CustomViewField }

export type CustomView = {
    columns?: string[],
    fields?: CustomViewFields,
    menu?: CustomViewMenu[]
};

export type CustomViews = { [key: string]: CustomView }

export type CustomType = {
    theme?: { type?: string, css?: string },
    forms?: CustomForms,
    views?: CustomViews,
};

let mergedJson: CustomType = {};

/**
 * Returns a structure of customizations. It is a combination of the default customizations and user's customization
 * The user customizations are stored in the Browser's local storage.
 * @returns
 */
export function getCustomizations(): CustomType {

    return mergedJson;
};

export function isMaterial() {
    const theme = getCustomizations().theme || {};
    return theme.type === undefined || theme.type === "material";
}

/**
 * Returns customization info for the specified view
 * @param path
 * @returns
 */
export function getCustomizationsView(path: string): CustomView | null {
    const views: CustomViews | undefined = getCustomizations()?.views;
    if (views) {
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
 * Note: a String value will be prepended with a quote (") to distinguish it from a field variable
 */
export function splitFormulaIntoParts(formula: string): string[] | null {
    let name = "";
    let ret: any[] = [];

    function pushElement(element: string | null) {
        if (name !== "") {
            ret.push(name);
            name = "";
        }
        if (element !== null) {
            ret.push(element);
        }
    }

    while (formula !== "") {
        const ch = formula.charAt(0);
        formula = formula.substring(1);
        const nextChar = formula !== "" ? formula.charAt(0) : null;
        if (ch === " ") {
            pushElement(null);
            continue;
        }
        else if (ch === "!") {
            if (nextChar === "=" || nextChar === "!") {
                pushElement(ch + nextChar);
                formula = formula.substring(1);
            }
            else {
                pushElement(ch);
            }
        }
        else if (ch === "\"") {
            let str = "\"";
            while (true) {
                if (formula === "") {
                    // string not terminated
                    return null;
                }
                else if (formula.substring(0, 2) === "\\\\") {
                    str += "\\";
                    formula = formula.substring(2);
                }
                else if (formula.substring(0, 2) === "\\\"") {
                    str += "\"";
                    formula = formula.substring(2);
                }
                else if (formula.charAt(0) === "\"") {
                    pushElement(str);
                    formula = formula.substring(1);
                    break;
                }
                else {
                    str += formula.charAt(0);
                    formula = formula.substring(1);
                }
            }
        }
        else if ("=&|".includes(ch)) {
            if (nextChar === ch) {
                formula = formula.substring(1);
            }
            pushElement(ch);
        }
        else if (isAlpha(ch) || (name !== "" && !name.endsWith(".") && isNumericOrPeriod(ch))) {
            name += ch;
        }
        else {
            //invalid
            return null;
        }
    }
    pushElement(null);
    return ret;
}

type FormulaPart = (boolean | string | FormulaPart[])

/**
 * Processes the formula by calculating the result from the data set
 * Note: This method is implemented because JavaScripts eval() is a security risk
 * and we should only process intended calculations. It will be expanded on a "need" basis.
 * @param data object containing a row of data
 * @param parts formula split into their various components
 * @returns result
 */
function handleFormula(data: TempAny, parts: FormulaPart[]): FormulaPart {
    function value(v: FormulaPart): any {
        if (typeof v === "string") {
            if (v.startsWith("\"")) {
                return v.substring(1);
            }
            else if (v === "true") {
                return true;
            }
            else if (v === "false") {
                return false;
            }
            else if (isAlpha(v.charAt(0))) {
                return getValue(data, v);
            }
        }
        else if (typeof v === "boolean") {
            return v;
        }
        return null;
    }

    for (let i = 0; i < parts.length; i++) {
        if (Array.isArray(parts[i])) {
            parts[i] = handleFormula(data, parts[i] as FormulaPart[]);
        }
    }
    if (parts.length === 1) {
        return value(parts[0]);
    }
    if (parts.length === 2 && parts[0] === "!" && (typeof parts[1] === "string")) {
        return !value(parts[1]);
    }
    else if (parts.length === 2 && parts[0] === "!!" && (typeof parts[1] === "string")) {
        return !!value(parts[1]);
    }
    else if (parts.length === 3 && parts[1] === "&") {
        return value(parts[0]) && value(parts[2]);
    }
    else if (parts.length === 3 && parts[1] === "|") {
        return value(parts[0]) || value(parts[2]);
    }
    else if (parts.length === 3 && parts[1] === "=") {
        return value(parts[0]) === value(parts[2]);
    }
    else if (parts.length === 3 && parts[1] === "!=") {
        return value(parts[0]) !== value(parts[2]);
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
export function evaluate(data: TempAny, formula: string): TempAny {
    let parts = splitFormulaIntoParts(formula);
    if (parts === null) {
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
function isObject(item: any): boolean {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Deep merge two objects.
 * @param merged object where data is merged into
 * @param data object to apply to the merged object
 */
export function mergeRecursive(merged: any, data: any): void {
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

export function mergeCustomizations(data: any): void {
    const custom = JSON.parse(localStorage.getItem(LOCAL_USER_SETTINGS) || "{}");
    mergeRecursive(custom, data);
    localStorage.setItem(LOCAL_USER_SETTINGS, JSON.stringify(custom, null, 2));
    mergeRecursive(mergedJson, custom);
}

type CustomizationsProps = {
    children?: JSX.Element | JSX.Element[];
}

export default function Customizations(props: CustomizationsProps): JSX.Element {
    const [done, setDone] = useState(false);

    async function initCustomizations() {
        // retrieve all configuration files
        const baseJson = (await axios.get("/ui/theme/base.json")).data || {};
        const userJson = JSON.parse(localStorage.getItem(LOCAL_USER_SETTINGS) || "{}");
        const themeType = userJson?.theme?.type || baseJson?.theme?.type || "material";
        const themeJson = (await axios.get("/ui/theme/" + themeType + ".json")).data || {};

        // merge configuration files together
        let merged = baseJson;
        mergeRecursive(merged, themeJson || {});
        mergeRecursive(merged, userJson);
        mergedJson = merged;

        // loading theme + user CSS files
        const themeCss = document.getElementById("theme_stylesheet");
        themeCss?.setAttribute("href", "/ui/theme/" + (mergedJson?.theme?.type || "material") + ".css");

        const userCss = document.getElementById("user_stylesheet");
        if (userCss && mergedJson?.theme?.css) {
            const css = mergedJson.theme.css;
            if (css.startsWith("http://") || css.startsWith("https://") || css.startsWith("/")) {
                userCss.setAttribute("href", css);
            }
            else {
                const urlCSS = URL.createObjectURL(new Blob([css], { type: "text/css" }));
                userCss.setAttribute("href", urlCSS);
            }
        }
        setDone(true);
    }

    useEffect(() => {
        initCustomizations();
    }, []);
    return <React.Fragment>{done ? props.children : null}</React.Fragment>;
}