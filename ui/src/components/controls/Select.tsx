// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { ReactNode } from 'react';
import { isMaterial } from '../../utils/Customizations';
import { FormControl, InputLabel, MenuItem, Select as MuiSelect } from '@mui/material'

export type SelectProps = {
    "data-testid"?: string,
    id: string,
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
    const { id, required, children } = props;
    if (isMaterial()) {
        return <FormControl key={id} fullWidth>
            <InputLabel id={"label_" + id}>{id}</InputLabel>
            <MuiSelect labelId={"label_" + id} label={id} {...props}>
                {children}
            </MuiSelect>
            {required && <span>Required</span>}
        </FormControl >;
    }
    else {
        return <div className="FieldBase FieldSelect" key={id}>
            <label id={"label_" + id}>{id}</label>
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