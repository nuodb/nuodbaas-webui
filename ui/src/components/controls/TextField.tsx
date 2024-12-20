// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import React from 'react';
import { isMaterial } from '../../utils/Customizations';
import { IconButton, InputAdornment, TextField as MuiTextField } from '@mui/material'

export type TextFieldProps = {
    "data-testid"?: string,
    error?: string,
    required?: boolean,
    id: string,
    label: string,
    type?: "password" | "datetime-local" | "text",
    value?: string,
    defaultValue?: string,
    autoFocus?: boolean,
    disabled?: boolean,
    icon?: React.ReactNode,
    iconOnClick?: React.MouseEventHandler<HTMLButtonElement> | undefined,
    onChange?: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void,
    onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void,
    onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void,
}

export default function TextField(props: TextFieldProps): JSX.Element {
    let fieldProps = { ...props };
    delete fieldProps.icon;
    delete fieldProps.iconOnClick;
    if (isMaterial()) {
        return <MuiTextField
            fullWidth={true}
            {...fieldProps}
            name={props.id}
            error={!!props.error}
            helperText={props.error}
            slotProps={(props.icon && {
                input: {
                    endAdornment:
                        <InputAdornment position="end">
                            <IconButton
                                aria-label=""
                                onClick={props.iconOnClick}
                            >
                                {props.icon}
                            </IconButton>
                        </InputAdornment>
                }
            }) || undefined
            }
        />;
    }
    else {
        return <div>
            <div className="NuoFieldBase NuoFieldString" key={props.id}>
                <label>{props.label}</label>
                <input name={props.id} {...fieldProps} />
                <button onClick={(event) => {
                    event.preventDefault();
                    props.iconOnClick && props.iconOnClick(event);
                }}>{props.icon}</button>
            </div>
            {props.error !== "" && <div className="NuoFieldError">{props.error}</div>}
        </div>
    }
}