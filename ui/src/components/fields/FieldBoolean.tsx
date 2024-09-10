import React from "react";
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import { getValue, setValue } from "./utils"
import FieldBase from "./FieldBase"

export default class FieldBoolean extends FieldBase {

    /**
     * show Field of type Boolean using the values and schema definition
     */
    show() {
        const { prefix, values, required, setValues, autoFocus } = this.props;
        let value = getValue(values, prefix);
        return <FormControl key={prefix} fullWidth>
            <InputLabel id={"label_" + prefix}>{prefix}</InputLabel>
            <Select labelId={"label_" + prefix} id={prefix} name={prefix} value={String(value || false)} label={prefix} autoFocus={autoFocus} onChange={({ target: input }) => {
                let v = { ...values };
                setValue(v, prefix, input.value);
                setValues(v);
            }} onBlur={() => this.validate()}>
                <MenuItem value="true">True</MenuItem>
                <MenuItem value="false">False</MenuItem>
            </Select>
            {required && <span>Required</span>}
        </FormControl>;
    }

    getDisplayValue() {
        const { prefix, values } = this.props;
        const value = getValue(values, prefix);
        return value ? "true" : "false";
    }
}
