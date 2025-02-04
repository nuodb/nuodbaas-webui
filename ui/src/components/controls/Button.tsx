// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import React, { ReactNode } from 'react';
import { isMaterial } from '../../utils/Customizations';
import { Button as MuiButton } from '@mui/material'

export type ButtonProps = {
    "data-testid"?: string,
    type?: "button" | "reset" | "submit",
    disabled?: boolean,
    variant?: "contained" | "outlined" | "text",
    style?: React.CSSProperties,
    children: ReactNode,
    className?: string
    onClick: (event: React.MouseEvent<HTMLButtonElement | MouseEvent>) => void
}
export default function Button(props: ButtonProps): JSX.Element {
    if (false && isMaterial()) {
        return <MuiButton disabled={props.disabled} variant={props.variant} {...props}>{props.children}</MuiButton>
    }
    else {
        return <button {...props}>{props.children}</button>
    }
}