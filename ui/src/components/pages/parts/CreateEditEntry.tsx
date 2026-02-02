// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getResourceByPath, getCreatePath, getChild, arrayToObject, getDefaultValue, submitForm, getSchemaPath } from "../../../utils/schema";
import { Rest } from "./Rest";
import Auth from "../../../utils/auth";
import { setValue } from "../../fields/utils";
import { matchesPath } from "../../../utils/schema";
import { FieldValuesType, FieldParameterType, TempAny, StringMapType, FieldParametersType } from "../../../utils/types";
import { getCustomizations } from "../../../utils/Customizations";
import { withTranslation } from "react-i18next";
import ResourceHeader from "./ResourceHeader";
import { Tab, Tabs } from "../../controls/Tabs";
import { Field } from "../../fields/Field";
import Dialog from "./Dialog";

type SectionFormParameterType = {
    params: FieldParametersType;
};

// returns the last portion of the items list
function getItemsLastPart(listResponse: any): string[] {
    let values: string[] = [];
    if (listResponse && listResponse.items && Array.isArray(listResponse.items)) {
        listResponse.items.forEach((item: string) => {
            const parts = item.split("/");
            values.push(parts[parts.length - 1]);
        });
    }
    return values;
}

// returns the first portion of the items list
function getItemsFirstPart(listResponse: any): string[] {
    let values: string[] = [];
    if (listResponse && listResponse.items && Array.isArray(listResponse.items)) {
        listResponse.items.forEach((item: string) => {
            values.push(item.split("/")[0]);
        });
    }
    return values;
}

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
    const [restCache, setRestCache] = useState<Map<string, any>>(new Map<string, any>());

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

    async function cachedGet(url: string): Promise<any> {
        let data = restCache.get(url);
        if (!data) {
            data = await Rest.get(url);
            let newRestCache = new Map(restCache);
            newRestCache.set(url, data);
            setRestCache(newRestCache);
        }
        return data;
    }

    function uniqueArray(array: any[]): any[] {
        return [...new Set(array)];
    }

    async function updateOrgProjDbEnums(data: TempAny, sections: SectionFormParameterType[]): Promise<SectionFormParameterType[]> {
        let ret: SectionFormParameterType[] = JSON.parse(JSON.stringify(sections));

        for (let i = 0; i < ret.length; i++) {
            if (ret[i].params["organization"]) {
                const users = await cachedGet("/users?listAccessible=true");
                const projects = await cachedGet("/projects?listAccessible=true");
                ret[i].params["organization"].enum = uniqueArray(
                    [...getItemsFirstPart(users), ...getItemsFirstPart(projects)]
                );
            }
            if (ret[i].params["project"]) {
                let enums: string[] = [];
                if (data.organization) {
                    const projects = await cachedGet("/projects/" + encodeURIComponent(data.organization) + "?listAccessible=true");
                    enums = uniqueArray(getItemsLastPart(projects));
                }
                ret[i].params["project"].enum = enums;
            }
            if (ret[i].params["database"]) {
                let enums: string[] = [];
                if (data.organization && data.project) {
                    const databases = await cachedGet("/databases/" + encodeURIComponent(data.organization) + "/" + encodeURIComponent(data.project) + "?listAccessible=true");
                    enums = uniqueArray(getItemsLastPart(databases));
                }
                ret[i].params["database"].enum = enums;
            }
        }
        return ret;
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
                    if (!Field({
                        op: "validate",
                        path,
                        prefix: key,
                        label: t("field.label." + key, key),
                        parameter,
                        values,
                        updateErrors,
                        setValues,
                        t,
                        errors: {},
                        required: false,
                        autoFocus: false,
                        expand: false,
                        hideTitle: false,
                        readonly: false
                    })) {
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

        const createPath = data ? path : getCreatePath(schema, path);
        const resource = getResourceByPath(schema, createPath);
        let formParams: any = undefined;
        let required: any = false;
        if (resource["put"]) {
            formParams = getChild(resource["put"], ["requestBody", "content", "application/json", "schema", "properties"])
            formParams = cloneRecursive(formParams);
            required = getChild(resource["put"], ["requestBody", "content", "application/json", "schema", "required"])
            required.forEach((req: TempAny) => {
                formParams[req].required = true;
            })
        }
        else if (resource["get"]) {
            formParams = getChild(resource["get"], ["responses", "200", "content", "application/json", "schema", "properties"])
            formParams = cloneRecursive(formParams);
            required = getChild(resource["get"], ["responses", "200", "content", "application/json", "schema", "required"])
            required.forEach((req: TempAny) => {
                formParams[req].required = true;
            })
        }
        const putOrGetResource = resource["put"] || resource["get"];

        let urlParams = arrayToObject(putOrGetResource["parameters"], "name");
        setUrlParameters(urlParams);

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

        // Note: for the users resource, we hide the "allowCrossOrganizationAccess" option and prompt user during form submission
        const queryParameters = (urlParams && Object.keys(urlParams)
            .filter(key => urlParams[key].in === "query" && (urlParams[key].name !== "allowCrossOrganizationAccess" || !path.startsWith("/users/")))
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

        updateOrgProjDbEnums(v, sectionFormParams)
            .then((sectionFormParams: SectionFormParameterType[]) => {
                setSectionFormParameters(sectionFormParams);
            });
    }, [schema, path, data, t]);

    useEffect(() => {
        if (sectionFormParameters.length === 0) {
            return;
        }
        updateOrgProjDbEnums(values, sectionFormParameters)
            .then((sectionFormParams: SectionFormParameterType[]) => {
                setSectionFormParameters(sectionFormParams);
            });
    }, [values]);

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
            Field({
                op: "validate",
                path,
                prefix: key,
                label: t("field.label." + key),
                parameter,
                values,
                updateErrors: updateErrors_,
                setValues,
                t,
                errors: {},
                required: false,
                autoFocus: false,
                expand: false,
                hideTitle: false,
                readonly: false
            });
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

    function hasOutOfOrgUserRules() {
        if (matchesPath(path, "/users/{organization}?/{user}")) {
            const allRules = [...(values.accessRule?.allow || []), ...(values.accessRule?.deny || [])];
            for (let r = 0; r < allRules.length; r++) {
                const ruleParts = allRules[r].split(":");
                if (ruleParts.length >= 2) {
                    if(ruleParts[1] !== values.organization) {
                        return true;
                    }
                    if(ruleParts[1].startsWith("/")) {
                        const parts = ruleParts[1].split("/"); // parts = ["", "resourceType", "org", ...]
                        if(parts.length >=3 && parts[2] === values.organization) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    async function handleSubmit() {
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

        // Handle special case where we need to add "?allowCrossOrganizationAccess=true" to the URL
        // if a user resource is created / updated with access rules outside their org.
        // We skip the prompt if no accessRule changes took place.
        let submitValues = { ...values };
        if (hasOutOfOrgUserRules()) {
            let accessRuleUnchanged = false;
            if (data) {
                const persistedValues: any = await Rest.get(path);
                if (values.accessRule && persistedValues.accessRule && JSON.stringify(values.accessRule) === JSON.stringify(persistedValues.accessRule)) {
                    accessRuleUnchanged = true;
                }
            }
            if (accessRuleUnchanged || "yes" === await Dialog.confirm(t("confirm.userAccessRuleCheck.title"), t("confirm.userAccessRuleCheck.body"), t)) {
                submitValues["allowCrossOrganizationAccess"] = true;
            }
            else {
                return;
            }
        }
        submitForm(urlParameters, formParameters, data ? path : getCreatePath(schema, path), submitValues)
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

            //hide other fields if organization/project/database fields are not filled out
            if ("organization" in formParameters) {
                if (key !== "organization" && !values["organization"]) {
                    return null;
                }
                if ("project" in formParameters) {
                    if (key !== "organization" && key !== "project" && !values["project"]) {
                        return null;
                    }
                    if ("database" in formParameters) {
                        if (key !== "organization" && key !== "project" && key !== "database" && !values["database"]) {
                            return null;
                        }
                    }
                }
            }

            return <div className="NuoFieldContainer" key={key}>{(Field({
                op: "edit",
                path,
                prefix: key,
                label: t("field.label." + key, key),
                parameter: formParameter,
                values,
                errors,
                updateErrors,
                setValues: (newValues => {
                    newValues = { ...newValues };
                    if (newValues["organization"] !== values["organization"]) {
                        delete newValues["project"];
                        delete newValues["database"];
                    }
                    else if (newValues["project"] !== values["project"]) {
                        delete newValues["database"];
                    }
                    setValues(newValues);
                }),
                expand: !section.title,
                autoFocus: key === focusField,
                hideTitle: ret.length === 1,
                required: false,
                readonly: ro,
                t
            }))}</div>
        });

        const label = section.title || t("section.title.general");
        const id = section.id || "section-" + label.toLowerCase();
        ret = ret.filter((r: any) => r !== null);
        if (ret.length === 0) {
            return <></>;
        }
        else {
            return <Tab key={id} id={id} label={label}>{ret}</Tab>;
        }
    }

    let badges: { [key: number]: number } = {};
    if (!readonly) {
        getTabIndexesWithErrors().forEach(index => {
            badges[index] = -1;
        })
    }

    let sectionsWithStatus = sectionFormParameters.map(section => {
        return showSectionFields(section);
    });
    if (values.status && readonly) {
        sectionsWithStatus.push(<Tab key="section-status" id="section-status" label="Status">
            {Field({
                op: "edit",
                path,
                prefix: "status",
                label: "Status",
                parameter: formParameters["status"],
                values,
                t: t,
                errors: {},
                required: false,
                autoFocus: false,
                expand: false,
                hideTitle: true,
                readonly: true,
                updateErrors: () => { },
                setValues: () => { }
            })}</Tab>);
    }

    return <>
        <ResourceHeader schema={schema} path={path} data={data} type={readonly ? "view" : data ? "edit" : "create"} onAction={() => {
            if (readonly) {
                navigate("/ui/resource/edit" + path);
            }
            else {
                handleSubmit();
            }
        }} />
        <form>
            <div className="fields">
                <Tabs currentTab={currentTab} setCurrentTab={(tab: number) => {
                    setCurrentTab(tab);
                    setFocusField(null);
                }}
                    badges={badges}>
                    {sectionsWithStatus}
                </Tabs>

                {("_error" in errors) && <h3 style={{ color: "red" }}>{errors["_error"]}</h3>}
                {("_errorDetail" in errors) && <div style={{ color: "red" }}>{errors["_errorDetail"]}</div>}
            </div>
        </form>
    </>
}

export default withTranslation()(CreateEditEntry);