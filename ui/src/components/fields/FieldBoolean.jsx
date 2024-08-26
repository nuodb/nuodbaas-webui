import React from "react";
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import { getValue, setValue } from "./utils"

export default class FieldBoolean {
    constructor(props) {
        this.props = props;
    }

    /**
     * show Field of type Boolean using the values and schema definition
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
        const { prefix, values, required, setValues, onExit } = this.props;
        let value = getValue(values, prefix);
        return <FormControl key={prefix} fullWidth>
            <InputLabel id={"label_" + prefix}>{prefix}</InputLabel>
            <Select labelId={"label_" + prefix} id={prefix} name={prefix} value={String(value || false)} label={prefix} onChange={({ target: input }) => {
                let v = { ...values };
                setValue(v, prefix, input.value);
                setValues(v);
            }} onBlur={event => onExit && onExit(prefix)}>
                <MenuItem value="true">True</MenuItem>
                <MenuItem value="false">False</MenuItem>
            </Select>
            {required && <span>Required</span>}
        </FormControl>;
    }
}