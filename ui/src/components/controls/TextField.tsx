// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import React from 'react';
import { isMaterial } from '../../utils/Customizations';
import { TextField as MuiTextField } from '@mui/material'

export type TextFieldProps = {
    "data-testid"?: string,
    error?: string,
    required?: boolean,
    id: string,
    label: string,
    type?: "password",
    value?: string,
    defaultValue?: string,
    autoFocus?: boolean,
    disabled?: boolean,
    onChange?: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void,
    onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void,
    onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void,
}

export default function TextField(props: TextFieldProps): JSX.Element {
    if (isMaterial()) {
        return <MuiTextField fullWidth={true} {...props} name={props.id} error={!!props.error} helperText={props.error} />
    }
    else {
        return <div>
            <div className="FieldBase FieldString" key={props.id}>
                <label>{props.label}</label>
                <input name={props.id} {...props} />
            </div>
            {props.error !== "" && <div className="FieldError">{props.error}</div>}
        </div>
    }
}