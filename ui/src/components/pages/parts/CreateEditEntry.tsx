// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FieldFactory from "../../fields/FieldFactory";
import { getResourceByPath, getCreatePath, getChild, arrayToObject, getDefaultValue, submitForm, getSchemaPath } from "../../../utils/schema";
import { RestSpinner } from "./Rest";
import Auth from "../../../utils/auth";
import { setValue } from "../../fields/utils";
import { matchesPath } from "../../../utils/schema";
import { FieldValuesType, FieldParameterType, TempAny, StringMapType, FieldParametersType } from "../../../utils/types";
import { getCustomizations } from "../../../utils/Customizations";
import { withTranslation } from "react-i18next";
import ResourceHeader from "./ResourceHeader";
import { Tab, Tabs } from "../../controls/Tabs";

type SectionFormParameterType = {
    params: FieldParametersType;
};

/**
 * common implementation of the /resource/create/* and /resource/edit/* requests
 */
function CreateEditEntry({ schema, path, data, readonly, org, t }: TempAny) {
    const navigate = useNavigate();

    const [formParameters, setFormParameters] = useState<FieldParametersType>({});
    const [sectionFormParameters, setSectionFormParameters] = useState<SectionFormParameterType[]>([]);
    const [urlParameters, setUrlParameters] = useState<FieldParametersType>({});
    const [values, setValues]: FieldValuesType = useState({});
    const [errors, setErrors] = useState<StringMapType>({});
    const [focusField, setFocusField] = useState<string | null>(null);
    const [currentTab, setCurrentTab] = useState<number>(0);

    function updateErrors(key: string, value: string | null): void {
        setErrors((errs: StringMapType) => {
            errs = { ...errs };
            if (value === null || value === undefined) {
                delete errs[key];
            }
            else {
                errs[key] = value;
            }
            return errs;
        })
    }

    useEffect(() => {
        function setDefaultValues(values: FieldValuesType, fullKey: string | null, params: FieldParametersType, data: TempAny) {
            Object.keys(params).forEach(key => {
                let defaultValue = getDefaultValue(params[key], data && data[key]);
                if (defaultValue !== null) {
                    const param = params[key];
                    if (param.type === "object" && param.properties) {
                        if (params[key].properties) {
                            setDefaultValues(values, fullKey ? (fullKey + "." + key) : key, param.properties, data[key]);
                        }
                    }
                    else {
                        setValue(values, fullKey ? (fullKey + "." + key) : key, defaultValue);
                    }
                }
            });
        }

        /**
         * Pre-fills empty field values based on provided URL parameters
         * @param {*} values field object to set values to
         * @param {*} path the URL path given
         * @param {*} createPath the path to create/update object. It contains the field name placeholders in the path
         */
        function setUrlValues(values: FieldValuesType, path: string, createPath: string) {
            const pathParts = path.split("/");
            const createParts = createPath.split("/");
            for (let i = 0; i < pathParts.length && i < createParts.length; i++) {
                if (createParts[i].startsWith("{") && createParts[i].endsWith("}")) {
                    const key = createParts[i].substring(1, createParts[i].length - 1);
                    if (!(key in values)) {
                        values[key] = pathParts[i];
                    }
                }
            }
        }

        /**
         * Determines the field to set the focus to
         * @param {*} values
         * @param {*} params
         * @returns
         */
        function setFocus(values: FieldValuesType, params: TempAny) {
            if (!params) {
                return;
            }

            let fieldName: string | null = null;

            Object.keys(params).forEach(key => {
                let parameter = params[key];
                if (parameter && fieldName === null && key in values) {
                    if (!FieldFactory.validateProps({ path, prefix: key, label: t("field.label." + key, key), parameter, values, updateErrors, setValues, t })) {
                        fieldName = key;
                    }
                }

            })

            //find first required empty field (or a field with an error)
            Object.keys(params).forEach(key => {
                if (fieldName === null && params[key].required) {
                    if (!(key in values) || values[key] === "") {
                        fieldName = key;
                    }
                }
            })
            setFocusField(fieldName);
        }

        function getCustomForm(path: string) {
            const customizations = getCustomizations();
            if (customizations && customizations.forms) {
                for (const sPath of Object.keys(customizations.forms)) {
                    if (matchesPath(path, sPath)) {
                        return customizations.forms[sPath];
                    }
                }
            }
            return null;
        }

        /** get field params for the specified field key (hierarchical ones are separated by period) */
        function getFieldParameters(formParams: FieldParametersType, key: string): FieldParameterType | undefined {
            const posPeriod = key.indexOf(".");
            if (posPeriod === -1) {
                return formParams[key];
            }
            else {
                const childForm = formParams[key.substring(0, posPeriod)];
                return childForm && childForm.properties && getFieldParameters(childForm.properties, key.substring(posPeriod + 1));
            }
        }

        function setFieldParameters(formParams: FieldParametersType, key: string, parameter: FieldParameterType) {
            const posPeriod = key.indexOf(".");
            if (posPeriod === -1) {
                formParams[key] = parameter;
            }
            else {
                const firstPart = key.substring(0, posPeriod);
                const remainingPart = key.substring(posPeriod + 1);
                if (!(firstPart in formParams)) {
                    formParams[firstPart] = { properties: {}, type: "object" };
                }
                const formParam = formParams[firstPart];
                if (formParam.properties) {
                    setFieldParameters(formParam.properties, remainingPart, parameter);
                }
            }
        }

        function deleteFieldParameters(formParams: FieldParametersType, key: string) {
            const posPeriod = key.indexOf(".");
            if (posPeriod === -1) {
                delete formParams[key];
            }
            else {
                const firstPart = key.substring(0, posPeriod);
                const remainingPart = key.substring(posPeriod + 1);
                if (!(firstPart in formParams)) {
                    formParams[firstPart] = { properties: {}, type: "object" };
                }
                const formParam = formParams[firstPart];
                if (formParam.properties) {
                    deleteFieldParameters(formParam.properties, remainingPart);
                }
            }
        }

        function cloneRecursive(obj: any): any {
            if (obj === null || obj === undefined) {
                return obj;
            }
            return JSON.parse(JSON.stringify(obj));
        }

        let createPath = data ? path : getCreatePath(schema, path);
        let putResource = getResourceByPath(schema, createPath)["put"];

        let urlParams = arrayToObject(putResource["parameters"], "name");
        setUrlParameters(urlParams);

        let formParams = getChild(putResource, ["requestBody", "content", "application/json", "schema", "properties"])
        formParams = cloneRecursive(formParams);
        let required = getChild(putResource, ["requestBody", "content", "application/json", "schema", "required"])
        required.forEach((req: TempAny) => {
            formParams[req].required = true;
        })
        let remainingFormParams = cloneRecursive(formParams);
        let sectionFormParams: TempAny = [{ params: formParams }];

        const customForm = getCustomForm(path);
        if (customForm && customForm.sections) {
            sectionFormParams = [];
            customForm.sections.forEach((section: TempAny, index: number) => {
                if (section.fields) {
                    let params = {};
                    let hasWildcard = false;
                    Object.keys(section.fields).forEach(key => {
                        if (key === "*") {
                            hasWildcard = true;
                        }
                        else {
                            let fieldParameters = cloneRecursive(getFieldParameters(formParams, key));
                            if (fieldParameters) {
                                Object.keys(section.fields[key]).forEach(fieldKey => {
                                    fieldParameters[fieldKey] = cloneRecursive(section.fields[key][fieldKey]);
                                })
                                setFieldParameters(params, key, fieldParameters);
                                deleteFieldParameters(remainingFormParams, key);
                            }
                        }
                    })
                    if (hasWildcard) {
                        Object.keys(remainingFormParams).forEach(key => {
                            let fieldParameters = cloneRecursive(getFieldParameters(remainingFormParams, key));
                            if (fieldParameters) {
                                setFieldParameters(params, key, fieldParameters);
                            }
                        })
                    }
                    const id = section?.title?.toLowerCase()?.replaceAll(".", "-") || "section-" + index;
                    sectionFormParams.push({ id, title: t(section.title), params });
                }
            });
        }

        let v = {};
        setDefaultValues(v, null, formParams, data);
        setUrlValues(v, path, createPath);
        setValues(v);
        setFocus(v, formParams);
        setFormParameters(formParams);

        const queryParameters = (urlParams && Object.keys(urlParams)
            .filter(key => urlParams[key].in === "query")
            .map(key => urlParams[key])) || [];

        if (queryParameters.length > 0) {
            let params: any = {};
            queryParameters.forEach((qp: any) => {
                if (qp.name && qp.schema) {
                    params[qp.name] = qp.schema;
                }
            })
            if (sectionFormParams.length > 0) {
                sectionFormParams[0].params = { ...params, ...sectionFormParams[0].params };
            }
            else {
                sectionFormParams = [{ id: "section-0", params: params }];
            }
        }
        setSectionFormParameters(sectionFormParams);
    }, [schema, path, data, t]);

    function getParentPath(path: string) {
        let lastSlash = path.lastIndexOf("/");
        if (lastSlash > 0) {
            return path.substring(0, lastSlash);
        }
        else {
            return path;
        }
    }

    function getErrorFields() {
        let errs = { ...errors };
        delete errs._error;
        delete errs._errorDetail;
        function updateErrors_(key: string, value: string | null) {
            updateErrors(key, value);
            if (value === null || value === undefined) {
                delete errs[key];
            }
            else {
                errs[key] = value;
            }
        }

        Object.keys(formParameters).forEach((key: string) => {
            let parameter: TempAny = formParameters[key];
            FieldFactory.validateProps({ path, prefix: key, label: t("field.label." + key), parameter, values, updateErrors: updateErrors_, setValues, t });
        });
        return errs;
    }

    function findTabIndex(fieldName: string) {
        function hasField(params: FieldParametersType, fieldName: string) {
            const posPeriod = fieldName.indexOf(".");
            if (posPeriod === -1) {
                return fieldName in params;
            }
            const firstPart = fieldName.substring(0, posPeriod);
            if (firstPart in params && params[firstPart].type === "object") {
                const properties = params[firstPart].properties;
                const remainingPart = fieldName.substring(posPeriod + 1);
                if (properties && hasField(properties, remainingPart)) {
                    return true;
                }
            }
            return false;
        }
        for (let i = 0; i < sectionFormParameters.length; i++) {
            if (hasField(sectionFormParameters[i].params, fieldName)) {
                return i;
            };
        }
        return -1;
    }

    function getTabIndexesWithErrors(): number[] {
        let errs = { ...errors };

        let ret: number[] = [];
        Object.keys(errs).forEach((field: string) => {
            const index = findTabIndex(field);
            if (index >= 0 && !ret.includes(index)) {
                ret.push(index);
            }
        })
        return ret;
    }

    function handleSubmit() {
        let err = { ...errors };
        delete err._error;
        delete err._errorDetail;
        setErrors(err);
        err = getErrorFields();
        if (Object.keys(err).length > 0) {
            const errKeys = Object.keys(err);
            const tabIndex = findTabIndex(errKeys[0]);
            if (tabIndex !== -1) {
                if (currentTab !== tabIndex) {
                    setCurrentTab(tabIndex);
                    setFocusField(errKeys[0]);
                }
                else {
                    const inputElement = document.getElementById(errKeys[0]);
                    if (inputElement) {
                        inputElement.focus();
                    }
                }
            }
            return;
        }
        submitForm(urlParameters, formParameters, data ? path : getCreatePath(schema, path), values)
            .then(() => {
                if (data) {
                //edit mode
                    navigate("/ui/resource/list" + getParentPath(path));
                }
                else {
                    //create mode
                    navigate("/ui/resource/list" + path);
                }
            })
            .catch(error => {
                Auth.handle401Error(error);
                if (error.response && error.response.data && error.response.data.status) {
                    updateErrors("_error", error.response.data.status);
                    updateErrors("_errorDetail", error.response.data.detail);
                }
                else {
                    updateErrors("_error", "Error occurred: " + JSON.stringify(error));
                    updateErrors("_errorDetail", null);
                }
            });
    }

    function showSectionFields(section: TempAny) {
        let ret = (section && section.params && Object.keys(section.params)
            .filter(key => {
                const param = section.params[key];
                return param.readOnly !== true && param.hidden !== true && key !== "resourceVersion"
            })) || [];
        if (ret.length === 0) {
            return <div key={section.title}></div>;
        }
        ret = ret.map((key: string) => {
            const formParameter = { ...section.params[key] };
            const ro = readonly
                || (data && (key in urlParameters || key === "name" || formParameter["x-immutable"] === true))
                || (key === "organization" && getSchemaPath(schema, path)?.includes("{organization}"));
            return <div className="NuoFieldContainer" key={key}>{(FieldFactory.create({
                path,
                prefix: key,
                label: t("field.label." + key, key),
                parameter: formParameter,
                values,
                errors,
                updateErrors,
                setValues,
                expand: !section.title,
                autoFocus: key === focusField,
                hideTitle: ret.length === 1,
                required: false,
                readonly: ro,
                t
            })).show()}</div>
        });

        const label = section.title || t("section.title.general");
        const id = section.id || "section-" + label.toLowerCase();
        return <Tab key={id} id={id} label={label}>{ret}</Tab>;
    }

    let badges: { [key: number]: number } = {};
    if (!readonly) {
        getTabIndexesWithErrors().forEach(index => {
            badges[index] = -1;
        })
    }

    return <>
        <RestSpinner />
        <ResourceHeader schema={schema} path={path} type={readonly ? "view" : data ? "edit" : "create"} onAction={() => {
            if (readonly) {
                navigate("/ui/resource/edit" + path);
            }
            else {
                handleSubmit();
            }
        }} />
        <form>
            <div className="fields">
                <Tabs currentTab={currentTab} setCurrentTab={setCurrentTab} badges={badges}>
                    {sectionFormParameters.map(section => {
                        return showSectionFields(section);
                    })}
                </Tabs>

                {("_error" in errors) && <h3 style={{ color: "red" }}>{errors["_error"]}</h3>}
                {("_errorDetail" in errors) && <div style={{ color: "red" }}>{errors["_errorDetail"]}</div>}
            </div>
        </form>
    </>
}

export default withTranslation()(CreateEditEntry);