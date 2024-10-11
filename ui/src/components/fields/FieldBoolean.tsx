// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import { getValue, setValue } from "./utils"
import FieldBase, { FieldBaseType, FieldProps } from "./FieldBase"
import { ReactNode } from 'react'
import { isMaterial } from '../../utils/Customizations'

export default function FieldBoolean(props: FieldProps): FieldBaseType {

    /**
     * show Field of type Boolean using the values and schema definition
     */
    function show(): ReactNode {
        const { prefix, values, required, setValues, autoFocus, readonly } = props;
        let value = getValue(values, prefix);

        const fieldProps = {
            id: prefix,
            name: prefix,
            value: String(value || false),
            autoFocus,
            onChange: (e: any) => {
                let v = { ...values };
                setValue(v, prefix, e.target.value);
                setValues(v);
            },
            onBlur: () => FieldBase(props).validate(),
            disabled: readonly
        };

        if (isMaterial()) {
            return <FormControl key={prefix} fullWidth>
                <InputLabel id={"label_" + prefix}>{prefix}</InputLabel>
                <Select labelId={"label_" + prefix} label={prefix} {...fieldProps}>
                    <MenuItem value="true">True</MenuItem>
                    <MenuItem value="false">False</MenuItem>
                </Select>
                {required && <span>Required</span>}
            </FormControl>;
        }
        else {
            return <div className="FieldBase FieldBoolean" key={prefix}>
                <label id={"label_" + prefix}>{prefix}</label>
                <select {...fieldProps}>
                    <option value="true">True</option>
                    <option value="false">False</option>
                </select>
                {required && <span>Required</span>}
            </div>;
        }
    }

    function getDisplayValue(): ReactNode {
        const { prefix, values } = props;
        const value = getValue(values, prefix);
        return value ? "true" : "false";
    }

    return { ...FieldBase(props), show, getDisplayValue };
}
