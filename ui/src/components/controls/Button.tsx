// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import React, { ReactNode } from 'react';
import { isMaterial } from '../../utils/Customizations';
import { Button as MuiButton } from '@mui/material'

export type ButtonProps = {
    "data-testid"?: string,
    type?: "button" | "reset" | "submit",
    variant?: "contained" | "outlined" | "text",
    style?: React.CSSProperties,
    children: ReactNode,
    onClick: (event: React.MouseEvent<HTMLButtonElement | MouseEvent>) => void
}
export default function Button(props: ButtonProps): JSX.Element {
    if (isMaterial()) {
        return <MuiButton variant={props.variant} {...props}>{props.children}</MuiButton>
    }
    else {
        return <button {...props}>{props.children}</button>
    }
}