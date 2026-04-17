// (C) Copyright 2025-2026 Dassault Systemes SE.  All Rights Reserved.

import React, { useEffect, useState } from "react"
import { withTranslation } from "react-i18next";
import { TempAny } from "../../../utils/types"
import { Feature, getChild, getCreatePath, getResourceByPath, getSchema } from "../../../utils/schema";
import CreatableSelect from 'react-select/creatable';
import {
    StylesConfig,
    components as RSComponents,
    ActionMeta,
    FormatOptionLabelMeta,
} from "react-select";
import ListResourceFilter, { FilterCondition, getFieldFilterLabel, SearchType } from "../ListResourceFilter";

type SearchProps = {
    path: string;
    search: string;
    setSearch: (search: string) => void;
    fieldNames?: string[];
    t: TempAny;
}

function getFieldsByPath(schema: TempAny, path: string) {
    function getFields(definition: any, prefix: string, outFields: { [key: string]: string }) {
        Object.keys(definition).forEach(key => {
            const type = definition[key].type;
            if (type === "object") {
                if (definition[key].additionalProperties) {
                    const apType = definition[key].additionalProperties.type;
                    if (apType === "string" || apType === "boolean" || apType === "integer") {
                        outFields[prefix + key] = apType;
                    }
                    else {
                        console.log("INVALID additionalProperties type", definition[key], key, type);
                    }
                }
                else if (definition[key].properties) {
                    getFields(definition[key].properties, key + ".", outFields);
                }
                else {
                    console.log("INVALID OBJECT", definition, prefix, path);
                }
            }
            else if (type === "string" || type === "boolean" || type === "integer") {
                outFields[prefix + key] = type;
            }
            else {
                console.log("INVALID TYPE", definition, key, prefix, definition[key].type);
            }
        })
    }

    let fields: { [key: string]: string } = {};
    const resource = getResourceByPath(schema, getCreatePath(schema, path));
    if (resource["put"]) {
        const formParams = getChild(resource["get"], ["responses", "200", "content", "application/json", "schema", "properties"])
        getFields(formParams, "", fields);
    }
    return fields;
}

function Search({ path, search, setSearch, fieldNames, t }: SearchProps) {
    const [searchFields, setSearchFields] = useState<SearchType[]>([]);
    const [editIndexOrNewField, setEditIndexOrNewField] = useState<string | number | null>(null);
    const [fields, setFields] = useState<{ [fieldname: string]: string }>({});

    useEffect(() => {
        getSchema().then(schema => {
            setFields(getFieldsByPath(schema, path));
        });
    }, [search]);

    const colorStyles: StylesConfig = {
        multiValue: (styles, { data }: any) => {
            return {
                ...styles,
                border: "3px solid#c7b08d",
            };
        },
    };

    // Custom MultiValue to allow user edits (for person field only)
    const MultiValue = (mprops: any) => {
        const child = (
            <span
                onDoubleClick={(e) => {
                    e.stopPropagation();
                }}
                role="button"
                aria-label="edit"
            >
                {mprops.children}
            </span>
        );

        return (
            <RSComponents.MultiValue {...mprops}>{child}</RSComponents.MultiValue>
        );
    };


    return <div style={{ display: "flex", flexDirection: "row", flex: "1 1 auto", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1100 }}>
        <ListResourceFilter editIndexOrNewField={editIndexOrNewField} search={searchFields} setSearch={(search: SearchType[] | null) => {
            if (search) {
                setSearchFields(search);
            }
            setEditIndexOrNewField(null);
            //setSearch(search);
        }} />
        <CreatableSelect
            className="NuoColumn"
            inputId={"select-search"}
            value={searchFields}
            isMulti={true}
            isClearable={false}
            options={Object.keys(fields).map(field => ({ field: field, value: "", condition: "contains" as FilterCondition, ignoreCase: true }))}
            onChange={(newValue: any, actionMeta: ActionMeta<SearchType>) => {
                if (actionMeta.action === "select-option" && actionMeta.option) {
                    setEditIndexOrNewField(actionMeta.option.field);
                }
                else {
                    setSearchFields(newValue);
                }
            }}
            formatOptionLabel={(data: SearchType, meta: FormatOptionLabelMeta<SearchType>) => {
                if (meta.context === "menu") {
                    return data.field;
                }
                else {
                    return getFieldFilterLabel(data);
                }
            }}
            menuPortalTarget={undefined}
            onCreateOption={(value) => {
            }}
            components={{
                DropdownIndicator: () => null,
                IndicatorSeparator: () => null, // Optional: also removes the vertical separator line
                MultiValue,
            }}
        />
    </div>;
}

export default withTranslation()(Search);
