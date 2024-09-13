// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

// the TempAny type allows us to temporarily declare variables as "any" type,
// so we can easily find them in source control and fix in future PR's
export type TempAny = any;

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
};

export type FieldParametersType = {
    [key: string] : FieldParameterType
};

export type SchemaType = TempAny;

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

export type CustomizationsType = {
    forms: {[key: string]:{
        sections: [
            CustomFormSection
        ],
    }}
    views: {[key: string]:{
        [key:string]:{
            value: (values: FieldValuesType) => string,
            buttons: [
                label: string,
                patch: any,
                visible: (values: FieldValuesType) => string,
                confirm: string
            ]
        }
    }}
};

export type StringMapType = {
    [key: string]: string
}
