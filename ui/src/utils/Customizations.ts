// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import axios from "axios";
import { TempAny } from "./types";
import { getValue } from "../components/fields/utils";

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

export type CustomView = {
    columns?: string[],
    definition?: {
        [key:string]:{
            value: string,
            buttons: [
                label: string,
                patch: any,
                visible: string,
                confirm: string
            ]
        }
    }
};

export type CustomViews = {[key: string]: CustomView}

export type CustomType = {
    theme?: string,
    forms?: CustomForms,
    views?: CustomViews,
};

let custom : CustomType = {};
let customInitialized = false;

export function getCustomizations() : CustomType {
    if(!customInitialized) {
        axios.get("/ui/customizations.json").then(response => {
            custom = response.data;
            customInitialized = true;
        })
    }
    return custom;
};

function isAlpha(ch: string) {
    return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z");
}

function isNumericOrPeriod(ch: string) {
    return (ch >= "0" && ch <= "9") || (ch === ".");
}

function splitInParts(formula: string) : string[]|null {
    let name = "";
    let ret = [];
    while(formula !== "") {
        const ch = formula.charAt(0);
        formula = formula.substring(1);
        if(ch === " ") {
            continue;
        }
        else if("!=".includes(ch)) {
            if(name !== "") {
                ret.push(name);
                name = "";
            }
            ret.push(ch);
        }
        else if(isAlpha(ch)) {
            name += ch;
        }
        else if(name !== "" && isNumericOrPeriod(ch)) {
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
        console.log("NOT", parts[1], !parts[1]);
        return !getValue(data, parts[1]);
    }
    else if(parts.length === 3 && (parts[1] === "&&" || parts[1] === "&")) {
        return parts[0] && parts[2];
    }
    else if(parts.length === 3 && (parts[1] === "||" || parts[1] === "|")) {
        return parts[0] || parts[2];
    }
    else {
        console.log("ERROR: invalid formula", parts);
        return "";
    }
}

export function customEvaluate(data: TempAny, formula: string) : TempAny {
    let parts = splitInParts(formula);
    if(parts === null) {
        console.log("invalid formula: " + formula);
        return "";
    }
    const ret = handleFormula(data, parts);
    return ret;
}