import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Field from "../../fields/Field";
import { getResourceByPath, getCreatePath, getChild, arrayToObject, getDefaultValue, submitForm } from "../../../utils/schema";
import RestSpinner from "./RestSpinner";
import Container from '@mui/material/Container'
import Button from '@mui/material/Button'
import Auth from "../../../utils/auth";
import { setValue } from "../../fields/utils";

/**
 * common implementation of the /resource/create/* and /resource/edit/* requests
 */
export default function CreateEditEntry ({schema, path, data}) {
    const navigate = useNavigate();

    const [ formParameters, setFormParameters ] = useState({});
    const [ urlParameters, setUrlParameters ] = useState({});
    const [ values, setValues ] = useState({});
    const [ errors, setErrors ] = useState({});

    function updateErrors(key, value) {
        setErrors(errs => {
            errs = { ...errs };
            if(value === null || value === undefined) {
                delete errs[key];
            }
            else {
                errs[key] = value;
            }
            return errs;
        })
    }

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

    function validateFields() {
        let success = true;
        Object.keys(formParameters).forEach(key => {
            let parameter = formParameters[key];
            const field = (Field.create({prefix: key, parameter, values, errors, updateErrors, setValues}));
            success = field.validate() && success;
        });
        return success;
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
            return (Field.create({prefix: key, parameter: urlParameter, values, errors, updateErrors, setValues})).show();
        }
        )}
        {formParameters && Object.keys(formParameters)
                .filter(key => formParameters[key].readOnly !== true)
                .map(key => {
                    let formParameter = {...formParameters[key]};
                    return (Field.create({prefix: key, parameter: formParameter, values, errors, updateErrors, setValues})).show();
                }
        )}

        {Object.keys(errors)
            .filter(key => key !== "_error" && key !== "_errorDetail")
            .map(key => <div style={{color: "red"}} key={key}>{errors[key]}</div>)
        }
        {errors._error && <h3 style={{color: "red"}}>{errors._error}</h3>}
        {errors._errorDetail && <div style={{color: "red"}}>{errors._errorDetail}</div>}

        <Button data-testid="create_resource__create_button" variant="contained" onClick={()=> {
            if(!validateFields()) {
                return;
            }
            submitForm(urlParameters, formParameters, data ? path : getCreatePath(schema, path), values)
                .then(() => {
                    navigate("/ui/resource/list" + getParentPath(path));
                })
                .catch(error => {
                    Auth.handle401Error(error);
                    if(error.response && error.response.data && error.response.data.status) {
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
