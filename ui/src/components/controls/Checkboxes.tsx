// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import React, { JSX, ReactNode } from 'react';

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

type CheckboxProps = {
    checked?: boolean;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    label: string;
    id: string;
}

type CheckboxItemType = {
    id: string;
    label?: string;
    selected?: boolean;
};

type CheckboxesProps = {
    items: CheckboxItemType[];
    setItems: (items: CheckboxItemType[]) => void;
}


export function Checkbox({id, checked, onChange, label}: CheckboxProps): JSX.Element {
    return <label className="NuoRow" style={{justifyContent: "left", alignItems: "center", padding: "5px"}}>
        <input name={id} type="checkbox" checked={checked} onChange={onChange} />
        {label}
    </label>;
}

export default function Checkboxes({items, setItems}: CheckboxesProps): ReactNode {
    return items.map((item,index) => <Checkbox id={item.id} checked={item.selected} label={item.label || item.id} onChange={(event)=>{
        let newItems = [...items];
        newItems[index] = {...newItems[index], selected: !newItems[index].selected};
        setItems(newItems);
    }}/>);
}
