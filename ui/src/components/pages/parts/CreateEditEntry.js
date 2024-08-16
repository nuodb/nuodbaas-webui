import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Field from "../../fields/Field";
import { getResourceByPath, getCreatePath, getChild, arrayToObject, getDefaultValue, submitForm } from "../../../utils/schema";
import RestSpinner from "./RestSpinner";
import Container from '@mui/material/Container'
import Button from '@mui/material/Button'
import Auth from "../../../utils/auth";
import { getValue, setValue } from "../../fields/utils";

/**
 * common implementation of the /resource/create/* and /resource/edit/* requests
 */
export default function CreateEditEntry ({schema, path, data}) {
    const navigate = useNavigate();

    const [ formParameters, setFormParameters ] = useState({});
    const [ urlParameters, setUrlParameters ] = useState({});
    const [ values, setValues ] = useState({});
    const [ errors, setErrors ] = useState({});

    useEffect(() => {
        function setDefaultValues(values, fullKey, params, data) {
            Object.keys(params).forEach(key => {
                let defaultValue = getDefaultValue(params[key], data && data[key]);
                if(defaultValue !== null) {
                    if(params[key].type === "object" && params[key].properties) {
                        setDefaultValues(values, fullKey ? (fullKey + "." + key) : key, params[key].properties, data[key]);
                    }
                    else {
                        setValue(values, fullKey ? (fullKey + "." + key) : key, defaultValue);
                    }
                }
            });
        }

        let createPath = data ? path : getCreatePath(schema, path);
        let putResource = getResourceByPath(schema, createPath)["put"];

        let urlParams = arrayToObject(putResource["parameters"], "name");
        setUrlParameters(urlParams);

        let formParams = getChild(putResource, ["requestBody", "content", "application/json", "schema", "properties"])
        formParams = JSON.parse(JSON.stringify(formParams));
        let required = getChild(putResource, ["requestBody", "content", "application/json", "schema", "required"])
        required.forEach(req => {
            formParams[req].required = true;
        })

        let v = {};
        setDefaultValues(v, null, formParams, data);
        setValues(v);
        setFormParameters(formParams);
    }, [schema, path, data]);

    function getParentPath(path) {
        let lastSlash = path.lastIndexOf("/");
        if(lastSlash > 0) {
            return path.substring(0, lastSlash);
        }
        else {
            return path;
        }
    }

    function validateField(prefix, parameter) {
        let value = getValue(values, prefix);

        console.log("ValidateField", prefix, parameter, value, values);
        if(!value) {
            if(parameter.required && !value) {
                return "Field " + prefix + "is required";
            }
        }
        else {
            if(parameter.pattern) {
                if(!(new RegExp("^" + parameter.pattern + "$")).test(value)) {
                    return "Field \"" + prefix + "\" must match pattern \"" + parameter.pattern + "\"";
                }
            }
        }
        return null;
    }

    function handleFieldExit(prefix, parameter) {
        console.log("handleFieldExit2", prefix, parameter);
        let errs = {...errors};
        const error = validateField(prefix, parameter);
        if(error) {
            errs[prefix] = error;
        }
        else {
            delete errs[prefix];
        }
        console.log("handleFieldExit", prefix, parameter, errs);
        setErrors(errs);
    }

    function validateFields() {
        let errs = {};
        Object.keys(formParameters).forEach(key => {
            let error = validateField(key, formParameters[key]);
            if(error) {
                errs[key] = error;
            }
            else {
                delete errs[key];
            }
        });
        setErrors(errs);
        return errs;
    }

    return <Container maxWidth="sm">
    <RestSpinner/>
    <form>
        <h1>{(data && "Edit") || "Create"} entry for {path}</h1>
        <div className="fields">
        {urlParameters && Object.keys(urlParameters)
        .filter(key => urlParameters[key]["in"] === "query")
        .map(key => {
            let urlParameter = {...urlParameters[key]};
            return <Field key={key} prefix={key} parameter={urlParameter} values={values} errors={errors} onExit={(k)=> handleFieldExit(k, urlParameter)} setValues={setValues}/>
        }
        )}
        {formParameters && Object.keys(formParameters)
                .filter(key => formParameters[key].readOnly !== true)
                .map(key => {
                    let formParameter = {...formParameters[key]};
                    return <Field key={key} prefix={key} parameter={formParameter} values={values} errors={errors} onExit={(k) => handleFieldExit(k, formParameter)} setValues={setValues}/>
                }
        )}

        {Object.keys(errors)
            .filter(key => key !== "_error" && key !== "_errorDetail")
            .map(key => <div style={{color: "red"}} key={key}>{errors[key]}</div>)
        }
        {errors._error && <h3 style={{color: "red"}}>{errors._error}</h3>}
        {errors._errorDetail && <div style={{color: "red"}}>{errors._errorDetail}</div>}

        <Button data-testid="create_resource__create_button" variant="contained" onClick={()=> {
            let errs = validateFields();
            if(Object.keys(errs).length > 0) {
                setErrors(errs);
                return;
            }
            submitForm(urlParameters, formParameters, data ? path : getCreatePath(schema, path), values)
                .then(() => {
                    navigate("/ui/resource/list" + getParentPath(path));
                })
                .catch(error => {
                    Auth.handle401Error(error);
                    let errs = {...errors};
                    if(error.response && error.response.data && error.response.data.status) {
                        errs["_error"] = error.response.data.status;
                        errs["_errorDetail"] = error.response.data.detail;
                    }
                    else {
                        errs["_error"] = "Error occurred: " + JSON.stringify(error);
                        delete errs["_errorDetail"];
                    }
                    setErrors(errs);
                });
        }}>{(data && "Save") || "Create"}</Button>
    </div>
    </form>
    </Container>
}
