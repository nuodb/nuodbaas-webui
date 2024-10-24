// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { ReactNode } from "react";
import FieldBase, { FieldBaseType, FieldProps } from "./FieldBase";
import FieldFactory from "./FieldFactory";
import { getDefaultValue } from "../../utils/schema";
import { setValue, getValue } from "./utils";
import FieldMessage from "./FieldMessage";
import Accordion from "../controls/Accordion";

export default function FieldObject(props: FieldProps): FieldBaseType {
    /**
     * show Field of type Object using the values and schema definition
     * @returns
     */
    function show(): ReactNode {
        const { prefix, parameter, values, errors, required, setValues, updateErrors, expand, hideTitle, t } = props;
        const properties = parameter.properties;
        if (!properties) {
            return FieldMessage({ ...props, message: "\"properties\" attribute missing from schema for field \"" + prefix + "\"" }).show();
        }
        let ret = Object.keys(properties).map(key => {
            let prefixKey = prefix ? (prefix + "." + key) : key;
            let defaultValue = getDefaultValue(properties[key], values && getValue(values, prefixKey));
            if (defaultValue !== null) {
                setValue(values, prefixKey, defaultValue);
            }
            return <div key={key} className="gap">{(FieldFactory.create({ ...props, prefix: prefixKey, parameter: properties[key], values, errors, required, setValues, updateErrors, expand: false })).show()}</div>
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
                const field = FieldFactory.create({ ...props, prefix: prefix + "." + subKey, parameter: properties[subKey], values, updateErrors });
                success = field.validate() && success;
            });
        }
        return success;
    }

    function getDisplayValue(): ReactNode {
        const { prefix, parameter, values } = props;
        const properties = parameter.properties;
        if (!properties) {
            return FieldMessage({ ...props, message: "\"properties\" attribute missing from schema for field \"" + prefix + "\"" }).show();
        }
        return <dl className="map">
            {Object.keys(properties).map(key => {
                const prefixKey = prefix ? (prefix + "." + key) : key;
                const field = FieldFactory.create({ ...props, prefix: prefixKey, parameter: properties[key], values });
                return <div key={key}><dt>{String(key)}</dt><dd>{field.getDisplayValue()}</dd></div>;
            })}
        </dl>
    }

    return { ...FieldBase(props), show, validate, getDisplayValue };
}