// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import { getValue, setValue } from "./utils"
import FieldBase, { FieldBaseType, FieldProps } from "./FieldBase"
import { ReactNode } from 'react'

export default function FieldBoolean(props: FieldProps): FieldBaseType {

    /**
     * show Field of type Boolean using the values and schema definition
     */
    function show(): ReactNode {
        const { prefix, values, required, setValues, autoFocus, readonly } = props;
        let value = getValue(values, prefix);
        return <FormControl key={prefix} fullWidth>
            <InputLabel id={"label_" + prefix}>{prefix}</InputLabel>
            <Select labelId={"label_" + prefix} id={prefix} name={prefix} value={String(value || false)} label={prefix} autoFocus={autoFocus} onChange={({ target: input }) => {
                let v = { ...values };
                setValue(v, prefix, input.value);
                setValues(v);
            }} onBlur={() => FieldBase(props).validate()} disabled={readonly}>
                <MenuItem value="true">True</MenuItem>
                <MenuItem value="false">False</MenuItem>
            </Select>
            {required && <span>Required</span>}
        </FormControl>;
    }

    function getDisplayValue(): ReactNode {
        const { prefix, values } = props;
        const value = getValue(values, prefix);
        return value ? "true" : "false";
    }

    return { ...FieldBase(props), show, getDisplayValue };
}
