// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import { ReactNode } from "react";

// the TempAny type allows us to temporarily declare variables as "any" type,
// so we can easily find them in source control and fix in future PR's
export type TempAny = any;

export type JsonType = {
    [key: string]: JsonType
} | JsonType[] | string | number | boolean | null;

export type FieldValuesType = TempAny;

export type FieldParameterType = {
    type: string,
    required?: boolean,
    pattern?: string,
    "x-tf-sensitive"?: boolean,
    expand?: boolean,
    in?: string,
    items?: FieldParameterType,
    properties?: FieldParametersType,
    additionalProperties?: FieldParameterType
    enum?: string[],
    description?: string,
    schema?: {
        default: boolean|string,
        type: string
    }
};

export type FieldParametersType = {
    [key: string] : FieldParameterType
};

export type SchemaType = TempAny;

export type StringMapType = {
    [key: string]: string
}

export type MenuItemProps = {
    "data-testid"?: string,
    id: string,
    label: ReactNode,
    selected?: boolean,
    onClick?: () => void
}

export type MenuProps = {
    "data-testid"?: string,
    align?: "left" | "right",
    popupId?: string,
    draggable?: boolean,
    children?: ReactNode,
    items: MenuItemProps[],
    setItems?: (items: MenuItemProps[]) => void,
    selected?: string,
    className?: string
};

export type RestMethodType = "get" | "put" | "delete" | "patch";
export type RestLogEntry = {
    timestamp: string,
    method: RestMethodType,
    url: string,
    success: boolean
    body?: JsonType,
}

export interface PageProps {
    schema: SchemaType,
    isRecording: boolean,
    org: string,
    setOrg: (org: string) => void;
    orgs: string[];
    t: any
};
