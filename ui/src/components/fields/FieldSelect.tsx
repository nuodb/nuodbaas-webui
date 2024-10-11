// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import { getValue, setValue } from "./utils"
import FieldBase, { FieldBaseType, FieldProps } from "./FieldBase"
import { ReactNode } from 'react'
import { isMaterial } from '../../utils/Customizations'

export default function FieldSelect(props: FieldProps): FieldBaseType {

    /**
     * show Field of type Boolean using the values and schema definition
     */
    function show(): ReactNode {
        const { prefix, values, parameter, required, setValues, autoFocus, readonly } = props;
        let value = getValue(values, prefix);

        const fieldProps = {
            id: prefix,
            name: prefix,
            value,
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
                <Select labelId={"label_" + prefix} {...fieldProps} label={prefix}>
                    <MenuItem key="selectItem" value="">--- Select Item ---</MenuItem>
                    {parameter && parameter.enums && parameter.enums.map(e => <MenuItem key={e.key} value={e.key}>{e.label}</MenuItem>)}
                </Select>
                {required && <span>Required</span>}
            </FormControl>;
        }
        else {
            return <div className="FieldBase FieldSelect" key={prefix}>
                <label id={"label_" + prefix}>{prefix}</label>
                <select {...fieldProps}>
                    <option key="selectItem" value="">--- Select Item ---</option>
                    {parameter && parameter.enums && parameter.enums.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
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
