// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import { ReactNode } from "react";
import { FieldProps } from "./FieldBase";
import { getDefaultValue } from "../../utils/schema";
import { setValue, getValue } from "./utils";
import FieldMessage from "./FieldMessage";
import Accordion from "../controls/Accordion";
import { Field } from "./Field";

export default function FieldObject(props: FieldProps): ReactNode {
    switch (props.op) {
        case "edit": return edit();
        case "view": return view();
        case "validate": return validate();
    }
    /**
     * show Field of type Object using the values and schema definition
     * @returns
     */
    function edit(): ReactNode {
        const { prefix, parameter, values, expand, hideTitle, t } = props;
        const properties = parameter.properties;
        if (!properties) {
            return FieldMessage({ ...props, message: "\"properties\" attribute missing from schema for field \"" + prefix + "\"" });
        }
        let ret = Object.keys(properties).map(key => {
            let prefixKey = prefix ? (prefix + "." + key) : key;
            let defaultValue = getDefaultValue(properties[key], values && getValue(values, prefixKey));
            if (defaultValue !== null) {
                setValue(values, prefixKey, defaultValue);
            }
            return <div key={key} className="NuoFieldContainer">{(Field({
                ...props,
                prefix: prefixKey,
                parameter: properties[key],
                expand: false,
                label: t("field.label." + prefixKey, prefixKey)
            }))}</div>
        });
        if (hideTitle) {
            return ret;
        }
        return <Accordion data-testid={"section-" + prefix} className="FieldObjectSection" key={prefix} defaultExpanded={!!expand} summary={t("field.label." + prefix, prefix)}>
            {ret}
        </Accordion>
    }

    function validate(): boolean {
        const { prefix, parameter, values, updateErrors } = props;
        const properties = parameter.properties;
        const value = values[prefix];
        let success = true;
        if (properties && value) {
            // validate objects (hierarchical fields)
            Object.keys(value).forEach(subKey => {
                const fieldValidate = Field({ ...props, prefix: prefix + "." + subKey, parameter: properties[subKey], values, updateErrors });
                success = !!fieldValidate && success;
            });
        }
        return success;
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