// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import React, { JSX } from 'react';
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
    type?: "password" | "datetime-local" | "text" | "file",
    value?: string,
    defaultValue?: string,
    autoFocus?: boolean,
    disabled?: boolean,
    icon?: React.ReactNode,
    leftIcon?: React.ReactNode,
    iconOnClick?: React.MouseEventHandler<HTMLButtonElement> | undefined,
    onChange?: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void,
    onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void,
    onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void,
    size?: "small" | "medium";
}

export default function TextField(props: TextFieldProps): JSX.Element {
    let fieldProps = { ...props };
    delete fieldProps.icon;
    delete fieldProps.leftIcon;
    delete fieldProps.iconOnClick;
    if (isMaterial()) {
        return <MuiTextField
            fullWidth={true}
            {...fieldProps}
            name={props.id}
            multiline={fieldProps.disabled}
            aria-details={props.description}
            error={!!props.error}
            helperText={props.error}
            size={props.size}
            slotProps={((props.icon || props.leftIcon || fieldProps.description) && {
                input: {
                    endAdornment: (props.icon || props.description) &&
                        <InputAdornment position="end">
                            {props.icon && <IconButton
                                aria-label=""
                                onClick={props.iconOnClick}
                            >
                                {props.icon}
                            </IconButton>}
                            <InfoPopup description={props.description} />
                        </InputAdornment>,
                    startAdornment: props.leftIcon &&
                        <InputAdornment position="start">
                            {props.leftIcon}
                        </InputAdornment>,
                }
            }) || undefined
            }
        />;
    }
    else {
        return <div>
            <div className="NuoFieldBase NuoFieldString" key={props.id} aria-details={props.description}>
                <label>{props.label}</label>
                <input name={props.id} {...fieldProps} size={undefined} />
                {props.iconOnClick && <button onClick={(event) => {
                    event.preventDefault();
                    props.iconOnClick && props.iconOnClick(event);
                }}>{props.icon}</button>}
                <InfoPopup description={props.description} />
            </div>
            {props.error !== "" && <div className="NuoFieldError">{props.error}</div>}
        </div>
    }
}