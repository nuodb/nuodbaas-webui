import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Field from "../../fields/Field";
import { getResourceByPath, getCreatePath, getChild, arrayToObject, getDefaultValue, submitForm } from "../../../utils/schema";
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
    const [ error, setError ] = useState("");
    const [ errorDetail, setErrorDetail ] = useState("");
    const [ message, setMessage ] = useState("");

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

    return <Container maxWidth="sm">
    <form>
        <h1>{(data && "Edit") || "Create"} entry for {path}</h1>
        <div className="fields">
        {urlParameters && Object.keys(urlParameters)
        .filter(key => urlParameters[key]["in"] === "query")
        .map(key => {
            let urlParameter = {...urlParameters[key]};
            return <Field key={key} prefix={key} parameter={urlParameter} values={values} setValues={setValues}/>
        }
        )}
        {formParameters && Object.keys(formParameters)
                .filter(key => formParameters[key].readOnly !== true)
                .map(key => {
                    let formParameter = {...formParameters[key]};
                    return <Field key={key} prefix={key} parameter={formParameter} values={values} setValues={setValues}/>
                }
        )}
        {error && <h3 style={{color: "red"}}>{error}</h3>}
        {errorDetail && <div style={{color: "red"}}>{errorDetail}</div>}
        {message && <div>{message}</div>}
        <Button variant="contained" onClick={()=> {
            submitForm(urlParameters, formParameters, data ? path : getCreatePath(schema, path), values)
                .then(() => {
                    setMessage("Sucess!");
                    setError("")
                    setErrorDetail("");
                    navigate("/ui/resource/list" + getParentPath(path));
                })
                .catch(error => {
                    Auth.handle401Error(error);
                    if(error.response && error.response.data && error.response.data.status) {
                        setMessage("");
                        setError(error.response.data.status);
                        setErrorDetail(error.response.data.detail);
                    }
                    else {
                        setError("Error occurred: " + JSON.stringify(error));
                        setErrorDetail("");
                    }
                });
        }}>{(data && "Save") || "Create"}</Button>
    </div>
    </form>
    </Container>
}
