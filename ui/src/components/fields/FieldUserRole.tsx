// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.

import { ReactNode, useEffect, useState } from "react";
import { FieldProps } from "./FieldBase";
import { getDefaultValue } from "../../utils/schema";
import { setValue, getValue } from "./utils";
import FieldMessage from "./FieldMessage";
import Accordion from "../controls/Accordion";
import { Field, Field_validate } from "./Field";
import { Rest } from "../pages/parts/Rest";
import FieldMap from "./FieldMap";

// returns all variables contained in the path
function getPathVariables(path: string) {
    if(!path) {
        return [];
    }
    let ret: string[] = [];
    const parts = path.split("{");
    for(let i=1; i<parts.length; i++) {
        ret.push(parts[i].split("}")[0]);
    }
    return ret;
}

export default function FieldUserRole(props: FieldProps): ReactNode {
    const [parametersByTemplate, setParametersByTemplate] = useState<{[key:string]:string[]}|undefined>(undefined);
    useEffect(()=>{
        Rest.get("/cluster/roletemplates?listAccessible=true&expand=true&limit=1000").then((roleTemplates:any)=>{
            if (roleTemplates.items && roleTemplates.items.length > 0) {
                let parameters:{[key:string]:string[]} = {};
                roleTemplates.items.forEach((item:any)=>{
                    if(item.name && item.spec) {
                        let variables: string[] = [];
                        if(item.spec.allow) {
                            item.spec.allow.forEach((allow:any)=>{
                                variables = [...variables, ...getPathVariables(allow.resource)];
                            });
                        }
                        if(item.spec.deny) {
                            item.spec.deny.forEach((deny:any)=>{
                                variables = [...variables, ...getPathVariables(deny.resource)];
                            });
                        }
                        parameters[item.name] = [...new Set(variables)];
                    }
                });
                setParametersByTemplate(parameters);
            }
        });
    },[]);

    switch (props.op) {
        case "edit": return edit();
        case "view": return view();
        case "validate": return Field_validate(props);
    }
    /**
     * show Field of type Object using the values and schema definition
     * @returns
     */
    function edit(): ReactNode {
        const { prefix, parameter, values, expand, hideTitle, t } = props;
        const properties = parameter.properties;
        if (!properties || !properties.name || !properties.params) {
            return FieldMessage({ ...props, message: "\"properties\" attribute missing from schema for field \"" + prefix + "\"" });
        }

        let ret = [];

        let prefixName = prefix ? (prefix + ".name") : "name";
        let defaultName = getDefaultValue(properties.name, values && getValue(values, prefixName));
        if (defaultName !== null) {
            setValue(values, prefixName, defaultName);
        }
        ret.push(<div key="name" className="NuoFieldContainer">{(Field({
            ...props,
            setValues:(values)=>{
                let v = JSON.parse(JSON.stringify(values));
                if(props.values.roles.length <= v.roles.length) {
                    for(let i=0; i<v.roles.length; i++) {
                        if(props.values.roles.length < v.roles.length || props.values.roles[i].name !== v.roles[i].name) {
                            v.roles[i].params = {};
                            const variables = parametersByTemplate ? (parametersByTemplate[v.roles[i].name] || []): [];
                            variables.forEach(variable => {
                                v.roles[i].params[variable] = "";
                            });
                        }
                    }
                }
                v.roles = v.roles.filter((r: any) => !!r.name);
                props.setValues(v);
            },
            prefix: prefixName,
            parameter: properties.name,
            expand: false,
            label: t("field.label." + prefixName, prefixName)
        }))}</div>)

        if(defaultName) {
            let prefixParams = prefix ? (prefix + ".params") : "params";
            let defaultParams = getDefaultValue(properties.params, values && getValue(values, prefixParams));
            if (defaultParams !== null) {
                setValue(values, prefixParams, defaultParams);
            }
            if (defaultParams && Object.keys(defaultParams).length > 0) {
                let allValues = JSON.parse(JSON.stringify(values));
                for(let i=0; i<allValues.roles.length; i++) {
                    let role = allValues.roles[i];
                    const variables = parametersByTemplate ? (parametersByTemplate[role.name] || []): [];
                    variables.forEach(variable => {
                        role.params[variable] = role.params[variable] || "";
                    });
                }

                ret.push(<div key="params" className="NuoFieldContainer"><FieldMap {
                    ...props}
                    values={allValues}
                    prefix={prefixParams}
                    parameter={properties.params}
                    expand={false}
                    fixedKeys={parametersByTemplate !== undefined}
                    label={t("field.label." + prefixParams, prefixParams)}
                /></div>);
            }
        }
        if (hideTitle) {
            return ret;
        }
        return <Accordion data-testid={"section-" + prefix} className="FieldObjectSection" key={prefix} defaultExpanded={!!expand} summary={t("field.label." + prefix, prefix)}>
            {ret}
        </Accordion>
    }

    function view(): ReactNode {
        const { prefix, parameter, values, t } = props;
        const properties = parameter.properties;
        if (!properties) {
            return FieldMessage({ ...props, message: "\"properties\" attribute missing from schema for field \"" + prefix + "\"" });
        }
        return <dl className="map">
            {Object.keys(properties).map(key => {
                const prefixKey = prefix ? (prefix + "." + key) : key;
                const fieldView = Field({ ...props, prefix: prefixKey, parameter: properties[key], values });
                return <div key={key}><dt>{t("field.label." + prefixKey, prefixKey)}</dt><dd>{fieldView}</dd></div>;
            })}
        </dl>
    }
}