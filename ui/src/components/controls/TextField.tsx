// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import React, { JSX, useState } from 'react';
import { IconButton, InputAdornment, TextField as MuiTextField } from '@mui/material';
import InfoPopup from './InfoPopup';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

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
    const [passwordVisible, setPasswordVisible] = useState<boolean>(false);

    let fieldProps = { ...props };
    delete fieldProps.icon;
    delete fieldProps.leftIcon;
    delete fieldProps.iconOnClick;
    return <MuiTextField
        fullWidth={true}
        {...fieldProps}
        name={props.id}
        multiline={fieldProps.disabled}
        aria-details={props.description}
        error={!!props.error}
        helperText={props.error}
        size={props.size}
        type={props.type === "password" && passwordVisible ? "text" : props.type}
        slotProps={((props.icon || props.leftIcon || fieldProps.description || props.type === "password") && {
            input: {
                endAdornment: (props.icon || props.description || props.type === "password") &&
                    <InputAdornment position="end">
                        {props.type === "password" && <IconButton
                            aria-label=""
                            onClick={() => {
                                setPasswordVisible(!passwordVisible);
                            }}
                            tabIndex={-1}>
                            {passwordVisible ? <VisibilityIcon /> : <VisibilityOffIcon />}
                        </IconButton>}
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