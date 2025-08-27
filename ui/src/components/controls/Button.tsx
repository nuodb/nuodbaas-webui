// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import React, { JSX, ReactNode } from 'react';

export type ButtonProps = {
    "data-testid"?: string,
    type?: "button" | "reset" | "submit",
    disabled?: boolean,
    variant?: "contained" | "outlined" | "text",
    style?: React.CSSProperties,
    children: ReactNode,
    className?: string
    onClick: () => void
}
export default function Button(props: ButtonProps): JSX.Element {
    return <button {...props} onClick={(event) => {
        event.preventDefault();
        props.onClick();
    }}>{props.children}</button>
}