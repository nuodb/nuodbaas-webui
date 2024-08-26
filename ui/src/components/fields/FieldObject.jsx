import React from "react";
import FieldBase from "./FieldBase";
import Field from "./Field";
import { getDefaultValue } from "../../utils/schema";
import { setValue, getValue } from "./utils";
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';

export default class FieldObject extends FieldBase {

    /**
     * show Field of type Object using the values and schema definition
     * @param prefix - contains field name (hierarchical fields are separated by period)
     * @param parameter - schema definition for this field
     * @param values - contains object with ALL values (and field names) of this form (not just this field).
     *                 the key is the field name (name is separated by period if the field is hierarchical)
     * @param errors - contains object with ALL errors (and field names) of this form (not just this field).
     *                 the key is the field name (name is separated by period if the field is hierarchical)
     * @param required
     * @param setValues - callback to update field value
     * @returns
     */
    show() {
        const { prefix, parameter, values, errors, required, setValues, updateErrors } = this.props;
        return <Card key={prefix}>
            <CardContent className="fields">
                <h3>{prefix}</h3>
                {Object.keys(parameter).map(key => {
                    let prefixKey = prefix ? (prefix + "." + key) : key;
                    let defaultValue = getDefaultValue(parameter[key], values && getValue(values, prefixKey));
                    if (defaultValue !== null) {
                        setValue(values, prefixKey, defaultValue);
                    }
                    return (Field.create({ prefix: prefixKey, parameter: parameter[key], values, errors, required, setValues, updateErrors })).show();
                })}
            </CardContent>
        </Card>
    }

    validate() {
        const { prefix, parameter, values } = this.props;
        const value = values[prefix];
        let success = true;
        if (parameter["properties"]) {
            // validate objects (hierarchical fields)
            Object.keys(value).forEach(subKey => {
                const field = Field.create({ prefix: prefix + "." + subKey, parameter }) && success;
                success = field.validate() && success;
            });
        }
        return success;
    }
}