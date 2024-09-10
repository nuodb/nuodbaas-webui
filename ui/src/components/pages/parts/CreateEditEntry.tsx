import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FieldFactory from "../../fields/FieldFactory";
import { getResourceByPath, getCreatePath, getChild, arrayToObject, getDefaultValue, submitForm } from "../../../utils/schema";
import RestSpinner from "./RestSpinner";
import Container from '@mui/material/Container'
import Button from '@mui/material/Button'
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import Auth from "../../../utils/auth";
import { setValue } from "../../fields/utils";
import { matchesPath } from "../../../utils/schema";
import { FieldValuesType, FieldParameterType, TempAny } from "../../../utils/types";

/**
 * common implementation of the /resource/create/* and /resource/edit/* requests
 */
export default function CreateEditEntry({ schema, path, data }: TempAny) {
    const navigate = useNavigate();

    const [formParameters, setFormParameters]: FieldParameterType = useState({});
    const [sectionFormParameters, setSectionFormParameters] = useState([]);
    const [urlParameters, setUrlParameters]: FieldParameterType = useState({});
    const [values, setValues]: FieldValuesType = useState({});
    const [errors, setErrors]: TempAny = useState({});
    const [focusField, setFocusField] = useState(null);

    function updateErrors(key: string, value: string | null) {
        setErrors((errs: TempAny) => {
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
        function setDefaultValues(values: FieldValuesType, fullKey: string | null, params: FieldParameterType, data: TempAny) {
            Object.keys(params).forEach(key => {
                let defaultValue = getDefaultValue(params[key], data && data[key]);
                if (defaultValue !== null) {
                    if (params[key].type === "object" && params[key].properties) {
                        setDefaultValues(values, fullKey ? (fullKey + "." + key) : key, params[key].properties, data[key]);
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
                    if (FieldFactory.validateProps({ prefix: key, parameter, values, updateErrors, setValues })) {
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
            let w: TempAny = window;
            let customizations = w["getCustomizations"] && w["getCustomizations"]();
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
        function getFieldParameters(formParams: FieldParameterType, key: string): FieldParameterType {
            const posPeriod = key.indexOf(".");
            if (posPeriod === -1) {
                return formParams[key];
            }
            else {
                const childForm = formParams[key.substring(0, posPeriod)];
                return childForm && childForm.properties && getFieldParameters(childForm.properties, key.substring(posPeriod + 1));
            }
        }

        function setFieldParameters(formParams: FieldParameterType, key: string, parameters: FieldParameterType) {
            const posPeriod = key.indexOf(".");
            if (posPeriod === -1) {
                formParams[key] = parameters;
            }
            else {
                const firstPart = key.substring(0, posPeriod);
                const remainingPart = key.substring(posPeriod + 1);
                if (!(firstPart in formParams)) {
                    formParams[firstPart] = { properties: {}, type: "object" };
                }
                setFieldParameters(formParams[firstPart].properties, remainingPart, parameters);
            }
        }

        function deleteFieldParameters(formParams: FieldParameterType, key: string) {
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
                deleteFieldParameters(formParams[firstPart].properties, remainingPart);
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
            Object.keys(customForm.sections).forEach(index => {
                const section = customForm.sections[index];
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
                    sectionFormParams.push({ title: section.title, params });
                }
            });
        }

        let v = {};
        setDefaultValues(v, null, formParams, data);
        setUrlValues(v, path, createPath);
        setValues(v);
        setFocus(v, formParams);
        setFormParameters(formParams);
        setSectionFormParameters(sectionFormParams);
    }, [schema, path, data]);

    function getParentPath(path: string) {
        let lastSlash = path.lastIndexOf("/");
        if (lastSlash > 0) {
            return path.substring(0, lastSlash);
        }
        else {
            return path;
        }
    }

    function validateFields() {
        let success = true;
        Object.keys(formParameters).forEach((key: string) => {
            let parameter: TempAny = formParameters[key];
            success = FieldFactory.validateProps({ prefix: key, parameter, values, updateErrors, setValues }) && success;
        });
        return success;
    }

    function showSectionFields(section: TempAny) {
        let ret = (section && section.params && Object.keys(section.params)
            .filter(key => {
                const param = section.params[key];
                return param.readOnly !== true && param.hidden !== true && key !== "resourceVersion"
            })) || [];
        ret = ret.map((key: string) => {
            let formParameter = { ...section.params[key] };
            return (FieldFactory.create({
                prefix: key,
                parameter: formParameter,
                values, errors,
                updateErrors,
                setValues,
                expand: !section.title,
                autoFocus: key === focusField,
                hideTitle: ret.length === 1,
                required: false
            })).show();
        });
        if (ret && ret.length > 0 && section.title) {
            ret = <Accordion className="advancedCard">
                <AccordionSummary data-testid={"section-" + section.title.toLowerCase()} className="AdvancedSection" expandIcon={<ArrowDropDownIcon />}>{section.title}</AccordionSummary>
                <AccordionDetails>
                    {ret}
                </AccordionDetails>
            </Accordion>;
        }
        return ret;
    }

    return <Container maxWidth="sm">
        <RestSpinner />
        <form>
            <h1>{(data && "Edit") || "Create"} entry for {path}</h1>
            <div className="fields">
                {urlParameters && Object.keys(urlParameters)
                    .filter(key => urlParameters[key]["in"] === "query")
                    .map(key => {
                        let urlParameter = { ...urlParameters[key] };
                        return (FieldFactory.create({ prefix: key, parameter: urlParameter, values, errors, updateErrors, setValues, autoFocus: key === focusField, required: false, expand: false, hideTitle: false })).show();
                    }
                    )}
                {sectionFormParameters.map(section => {
                    return showSectionFields(section);
                })}

                {errors._error && <h3 style={{ color: "red" }}>{errors._error}</h3>}
                {errors._errorDetail && <div style={{ color: "red" }}>{errors._errorDetail}</div>}

                <Button data-testid="create_resource__create_button" variant="contained" onClick={() => {
                    let err: TempAny = { ...errors };
                    delete err._error;
                    delete err._errorDetail;
                    setErrors(err);
                    if (!validateFields()) {
                        const errorKeys = Object.keys(errors);
                        if (errorKeys.length > 0) {
                            const inputElement = document.getElementById(errorKeys[0]);
                            if (inputElement) {
                                inputElement.focus();
                            }
                        }
                        return;
                    }
                    submitForm(urlParameters, formParameters, data ? path : getCreatePath(schema, path), values)
                        .then(() => {
                            navigate("/ui/resource/list" + getParentPath(path));
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
                }}>{(data && "Save") || "Create"}</Button>
            </div>
        </form>
    </Container>
}
