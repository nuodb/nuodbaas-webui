// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import FieldString from "./FieldString";
import FieldHidden from "./FieldHidden";
import FieldPassword from "./FieldPassword";
import FieldBoolean from "./FieldBoolean";
import FieldObject from "./FieldObject";
import FieldMap from "./FieldMap";
import FieldArray from "./FieldArray";
import FieldInteger from "./FieldInteger";
import FieldMessage from "./FieldMessage";
import FieldDateTime from "./FieldDateTime";
import { FieldBaseType, FieldProps, FieldPropsDisplay, FieldPropsValidate } from "./FieldBase";
import { ReactNode } from "react";
import FieldSelect from "./FieldSelect";
import FieldCrontab from "./FieldCrontab";

/** Factory function to create components based on the field type */
const FieldFactory = {
    create: (props: FieldProps): FieldBaseType => {
        props = { ...props };
        let leftOvers = JSON.parse(JSON.stringify(props.parameter || {}));
        if (!("schema" in leftOvers)) {
            leftOvers["schema"] = {};
        }

        function get(key1: string, key2?: string) {
            if (!key2) {
                let ret = leftOvers[key1];
                delete leftOvers[key1];
                return ret;
            }
            else {
                let ret = leftOvers[key1][key2];
                delete leftOvers[key1][key2];
                return ret;
            }
        }

        let in_ = get("in");
        if (in_ && in_ !== "path" && in_ !== "query") {
            throw new Error("Invalid IN value " + in_);
        }

        props.required = get("required");

        let format = get("format");
        let type = get("type")
        if (!type) {
            type = get("schema", "type");
            format = get("schema", "format");
        }

        if (type === "string" && format === "date-time") {
            return FieldDateTime(props);
        }
        else if (type === "string") {
            if (props.prefix === "resourceVersion") {
                return FieldHidden(props);
            }
            else if (props.parameter["x-tf-sensitive"] === true) {
                return FieldPassword(props);
            }
            else if (props.parameter.enum) {
                return FieldSelect(props);
            }
            else if (props.prefix === "frequency" && (props.path === "/backuppolicies" || props.path.startsWith("/backuppolicies/"))) {
                return FieldCrontab(props);
            }
            else {
                return FieldString(props);
            }
        }
        else if (type === "boolean") {
            return FieldBoolean(props);
        }
        else if (type === "object") {
            if (props.parameter["properties"]) {
                if (props.parameter.expand === false || props.parameter.expand === true) {
                    props.expand = props.parameter.expand;
                }

                return FieldObject(props);
            }
            else if (props.parameter["additionalProperties"]) {
                return FieldMap(props);
            }
            else {
                return FieldMessage({ ...props, message: "ERROR: Invalid object" });
            }
        }
        else if (type === "array") {
            return FieldArray(props);
        }
        else if (type === "integer") {
            return FieldInteger(props);
        }
        else {
            return FieldMessage({ ...props, message: "Invalid type " + String(type) + " " + JSON.stringify(props.parameter) + " " + JSON.stringify(leftOvers) });
        }
    },

    createDisplayValue: (props: FieldPropsDisplay): ReactNode => {
        return FieldFactory.create({
            setValues: () => { },
            errors: {},
            updateErrors: () => { },
            required: false,
            autoFocus: false,
            expand: false,
            hideTitle: false,
            readonly: true,
            ...props
        }).getDisplayValue();
    },

    validateProps: (props: FieldPropsValidate): boolean => {
        const field: FieldBaseType = FieldFactory.create({ errors: {}, required: false, autoFocus: false, expand: false, hideTitle: false, readonly: true, ...props });
        return field.validate();
    }
}

export default FieldFactory;
