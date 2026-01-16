// (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved.

import { JSX, ReactNode } from 'react';
import { FormControl, InputAdornment, InputLabel, MenuItem, Select as MuiSelect } from '@mui/material'
import InfoPopup from './InfoPopup';
import { withTranslation } from 'react-i18next';

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
    t: any,
}

export type SelectOptionProps = {
    value: string,
    children: any,
}

function Select(props: SelectProps): JSX.Element {
    const { id, label, description, required, children, t } = props;
    return <FormControl key={id} fullWidth>
        <InputLabel id={"label_" + id}>{label}</InputLabel>
        <MuiSelect
            labelId={"label_" + id}
            id={id}
            name={id}
            label={label}
            value={props.value || ""}
            required={props.required}
            autoFocus={props.autoFocus}
            disabled={props.disabled}
            onChange={props.onChange}
            onBlur={props.onBlur}
            endAdornment={(description) &&
                <InputAdornment position="end">
                    <InfoPopup description={description} />
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
        {required && <span>{t("field.required")}</span>}
    </FormControl >;
}

export function SelectOption(props: SelectOptionProps): JSX.Element {
    const { value, children } = props;
    return <MenuItem key={value} {...props}>{children}</MenuItem>;
}

export default withTranslation()(Select);