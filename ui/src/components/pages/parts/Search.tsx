// (C) Copyright 2025-2026 Dassault Systemes SE.  All Rights Reserved.

import React, { useEffect, useState } from "react"
import { withTranslation } from "react-i18next";
import { TempAny } from "../../../utils/types"
import { getChild, getCreatePath, getResourceByPath, getSchema } from "../../../utils/schema";
import CreatableSelect from 'react-select/creatable';
import {
    components as RSComponents,
    ActionMeta,
    FormatOptionLabelMeta,
} from "react-select";
import ListResourceFilter, { FilterCondition, getFieldFilterLabel, isSameSearch, SearchType } from "../ListResourceFilter";

type SearchProps = {
    path: string;
    search: SearchType[];
    setSearch: (search: SearchType[]) => void;
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
                        outFields[prefix + key + ".*"] = apType;
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
            else if (type === "array") {
                if (definition[key].items?.type === "string") {
                    outFields[prefix + key + "[]"] = type;
                }
                else if (definition[key].items?.type === "object") {
                    if (definition[key].items.additionalProperties) {
                        const apType = definition[key].items.additionalProperties.type;
                        if (apType === "string" || apType === "boolean" || apType === "integer") {
                            outFields[prefix + key] = apType;
                        }
                        else {
                            console.log("INVALID INNER additionalProperties type", definition[key], key, type);
                        }
                    }
                    else if (definition[key].items.properties) {
                        getFields(definition[key].items.properties, key + ".", outFields);
                    }
                    else {
                        console.log("INVALID INNER OBJECT", definition, prefix, path);
                    }
                }
                else {
                    console.log("ARRAY TYPE", type, definition, key, prefix, definition[key].type);
                }
            }
            else {
                console.log("INVALID TYPE", type, definition, key, prefix, definition[key].type);
            }
        })
    }

    let fields: { [key: string]: string } = {};
    const resource = getResourceByPath(schema, getCreatePath(schema, path));
    if (resource["put"]) {
        const formParams = getChild(resource["get"], ["responses", "200", "content", "application/json", "schema", "properties"]);
        console.log("formParams", formParams);
        getFields(formParams, "", fields);
    }
    return fields;
}

function Search({ path, search, setSearch, fieldNames, t }: SearchProps) {
    const [editIndexOrNewField, setEditIndexOrNewField] = useState<string | number | null>(null);
    const [fields, setFields] = useState<{ [fieldname: string]: string }>({});

    useEffect(() => {
        getSchema().then(schema => {
            setFields(getFieldsByPath(schema, path));
            console.log("getFieldsByPath", getCreatePath(schema, path), getFieldsByPath(schema, path), schema);
        });
    }, [search]);

    // Custom MultiValue to allow user edits (for person field only)
    const CustomOption = (mprops: any) => {
        const child = (
            <span
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    const index = search.findIndex(s => isSameSearch(s, mprops.data));
                    if (index >= 0) {
                        setEditIndexOrNewField(index);
                    }
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

    const selectOptions = Object.keys(fields).map(field => ({
        value: field, // needed for field search
        label: field, // needed for field search
        field: field,
        key: "",
        condition: "contains" as FilterCondition,
        ignoreCase: true
    }));

    return <div style={{ display: "flex", flexDirection: "row", flex: "1 1 auto", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1100 }}>
        <ListResourceFilter editIndexOrNewField={editIndexOrNewField} fields={fields} search={search} setSearch={(search: SearchType[] | null) => {
            setEditIndexOrNewField(null);
            if (search !== null) {
                setSearch(search);
            }
        }} />
        <CreatableSelect
            className="NuoColumn"
            inputId={"select-search"}
            value={search}
            isMulti={true}
            isClearable={false}
            options={selectOptions}
            onChange={(newValue: any, actionMeta: ActionMeta<SearchType>) => {
                if (actionMeta.action === "select-option" && actionMeta.option) {
                    setEditIndexOrNewField(actionMeta.option.field);
                }
                else if (actionMeta.action === "remove-value") {
                    setSearch(search.filter(s => !isSameSearch(s, actionMeta.removedValue)));
                }
                else {
                    setSearch(newValue);
                }
            }}
            formatCreateLabel={(inputValue) => `search("${inputValue}")`}
            formatOptionLabel={(data: SearchType, meta: FormatOptionLabelMeta<SearchType>) => {
                if (meta.context === "menu") {
                    return data.label;
                }
                else {
                    return getFieldFilterLabel(data);
                }
            }}
            menuPortalTarget={undefined}
            onCreateOption={(value) => {
                setSearch([...search, {
                    field: "",
                    condition: "search",
                    value: value,
                    key: "",
                    ignoreCase: true
                }]);
            }}
            components={{
                DropdownIndicator: () => null,
                IndicatorSeparator: () => null, // Optional: also removes the vertical separator line
                MultiValue: CustomOption,
            }}
        />
    </div>;
}

export default withTranslation()(Search);
