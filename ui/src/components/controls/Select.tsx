// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { ReactNode } from 'react';
import { isMaterial } from '../../utils/Customizations';
import { FormControl, InputLabel, MenuItem, Select as MuiSelect } from '@mui/material'

export type SelectProps = {
    "data-testid"?: string,
    id: string,
    label?: string,
    value: string,
    children: ReactNode,
    required?: boolean,
    autoFocus?: boolean,
    disabled?: boolean,
    onChange?: (event: any) => void,
    onBlur?: (event: any) => void,
}

export type SelectOptionProps = {
    value: string,
    children: any,
}

export default function Select(props: SelectProps): JSX.Element {
    const { id, label, required, children } = props;
    if (isMaterial()) {
        return <FormControl key={id} fullWidth>
            <InputLabel id={"label_" + id}>{label}</InputLabel>
            <MuiSelect labelId={"label_" + id} name={id} label={label} {...props}>
                {children}
            </MuiSelect>
            {required && <span>Required</span>}
        </FormControl >;
    }
    else {
        return <div className="FieldBase FieldSelect" key={id}>
            <label id={"label_" + id}>{label}</label>
            <select name={id} {...props}>
                {children}
            </select>
            {required && <span>Required</span>}
        </div>;
    }
}

export function SelectOption(props: SelectOptionProps): JSX.Element {
    const { value, children } = props;
    if (isMaterial()) {
        return <MenuItem key={value} {...props}>{children}</MenuItem>;
    }
    else {
        return <option key={value} {...props}>{children}</option >;
    }
}