// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React from 'react';
import { isMaterial } from '../../utils/Customizations';
import { IconButton, InputAdornment, TextField as MuiTextField } from '@mui/material';
import InfoPopup from './InfoPopup';

export type TextFieldProps = {
    "data-testid"?: string,
    error?: string,
    required?: boolean,
    id: string,
    label: string,
    description?: string,
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
            aria-details={props.description}
            error={!!props.error}
            helperText={props.error}
            slotProps={((props.icon || fieldProps.description) && {
                input: {
                    endAdornment:
                        <InputAdornment position="end">
                            {props.icon && <IconButton
                                aria-label=""
                                onClick={props.iconOnClick}
                            >
                                {props.icon}
                            </IconButton>}
                            {props.description && <InfoPopup description={props.description} />}
                        </InputAdornment>
                }
            }) || undefined
            }
        />;
    }
    else {
        return <div>
            <div className="NuoFieldBase NuoFieldString" key={props.id} aria-details={props.description}>
                <label>{props.label}</label>
                <input name={props.id} {...fieldProps} />
                {props.iconOnClick && <button onClick={(event) => {
                    event.preventDefault();
                    props.iconOnClick && props.iconOnClick(event);
                }}>{props.icon}</button>}
                {props.description && <InfoPopup description={props.description} />}
            </div>
            {props.error !== "" && <div className="NuoFieldError">{props.error}</div>}
        </div>
    }
}