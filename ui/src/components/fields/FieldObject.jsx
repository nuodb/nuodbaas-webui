import React from "react";
import Field from "./Field";
import { getDefaultValue } from "../../utils/schema";
import { setValue, getValue } from "./utils";
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';

export default class FieldObject {
    constructor(props) {
        this.props = props;
    }

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
     * @param onExit onExit callback. first argument is the field prefix
     * @returns
     */
    show() {
        const { prefix, parameter, values, errors, required, setValues, onExit } = this.props;
        return <Card key={prefix}>
            <CardContent className="fields">
                <h3>{prefix}</h3>
                {Object.keys(parameter).map(key => {
                    let prefixKey = prefix ? (prefix + "." + key) : key;
                    let defaultValue = getDefaultValue(parameter[key], values && getValue(values, prefixKey));
                    if (defaultValue !== null) {
                        setValue(values, prefixKey, defaultValue);
                    }
                    return (new Field({ prefix: prefixKey, parameter: parameter[key], values, errors, required, setValues, onExit })).show();
                })}
            </CardContent>
        </Card>
    }
}