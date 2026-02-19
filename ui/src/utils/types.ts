// (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved.

import { ReactNode } from "react";
import { BackgroundTaskType } from "./BackgroundTasks";

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
    "x-enum-descriptions"?: {[key:string]:string},
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
    icon?: ReactNode,
    label: ReactNode,
    selected?: boolean,
    disabled?: boolean,
    onClick?: () => boolean
    onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void
}

export type MenuProps = {
    "data-testid"?: string,
    align?: "left" | "right",
    popupId?: string,
    draggable?: boolean,
    children?: ReactNode,
    items: MenuItemProps[],
    defaultItem?: string,
    setItems?: (items: MenuItemProps[]) => void,
    selected?: string,
    className?: string
};

export type RestMethodType = "get" | "put" | "post" | "delete" | "patch";
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
    tasks: BackgroundTaskType[];
    setTasks: React.Dispatch<React.SetStateAction<BackgroundTaskType[]>>;
    t: any
};

export type SortColumnDirectionType = {
    column: string;
    direction: "none" | "asc" | "desc";
};
