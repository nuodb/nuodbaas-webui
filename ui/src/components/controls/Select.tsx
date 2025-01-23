// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { ReactNode } from 'react';
import { isMaterial } from '../../utils/Customizations';
import { FormControl, InputAdornment, InputLabel, MenuItem, Select as MuiSelect } from '@mui/material'
import InfoPopup from './InfoPopup';

export type SelectProps = {
    "data-testid"?: string,
    id: string,
    label?: string,
    description?: string,
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
    const { id, label, description, required, children } = props;
    if (isMaterial()) {
        return <FormControl key={id} fullWidth>
            <InputLabel id={"label_" + id}>{label}</InputLabel>
            <MuiSelect labelId={"label_" + id} name={id} label={label} {...props} value={props.value || ""}
                endAdornment={(description) &&
                    <InputAdornment position="end">
                        {description && <InfoPopup description={description} />}
                    </InputAdornment>
                }
                sx={{
                    "& .MuiSelect-icon": {
                        right: description ? "40px !important;" : "0"
                    },
                }}
            >
                {children}
            </MuiSelect>
            {required && <span>Required</span>}
        </FormControl >;
    }
    else {
        return <div className="NuoFieldBase NuoFieldSelect" key={id}>
            <label id={"label_" + id}>{label}</label>
            <select name={id} {...props} value={props.value || ""}>
                {children}
            </select>
            {required && <span>Required</span>}
            {description && <InfoPopup description={description} />}
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