// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { ReactNode, useState } from 'react';
import { isMaterial } from '../../utils/Customizations';
import { Menu as MuiMenu } from '@mui/material';
import MenuItem from '@mui/material/MenuItem';
import Button from './Button';

type MenuItemProps = {
    id: string,
    label: string,
    onClick: () => void
}

type MenuItemsProps = MenuItemProps[];

type MenuProps = {
    "data-testid"?: string,
    align?: "left" | "right",
    children?: ReactNode,
    items: MenuItemsProps,
    className?: string
};

export default function Menu(props: MenuProps): JSX.Element {
    const { align, children, items, className } = props;
    const [anchor, setAnchor] = useState<Element | null>(null);

    function popupMenu(items: MenuItemsProps) {
        if (isMaterial()) {
            return <MuiMenu
                sx={{ mt: '5px' }}
                id="menu-appbar"
                anchorEl={anchor}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: align || 'right',
                }}
                keepMounted
                transformOrigin={{
                    vertical: 'top',
                    horizontal: align || 'right',
                }}
                open={Boolean(anchor)}
                onClose={() => setAnchor(null)}
            >
                {items.map(item => <MenuItem key={item.id} data-testid={item.id} onClick={() => {
                    setAnchor(null);
                    item.onClick();
                }}>{item.label}</MenuItem>)}
            </MuiMenu>;
        }
        const rect = anchor?.getBoundingClientRect();
        const x = align === "right" ? rect?.right : rect?.left;
        return <div style={{ display: anchor ? "block" : "none", position: "fixed", right: 0, left: 0, top: 0, bottom: 0, backgroundColor: "transparent" }} onClick={() => setAnchor(null)}>
            <div style={{ position: "absolute", right: x, left: x, top: rect?.bottom, bottom: rect?.bottom }}>
                <ul id="NuoMenuPopup" className={"NuoMenuPopup " + (align === "right" ? " NuoAlignRight" : " NuoAlignLeft")}>
                    {items.map(item => <li key={item.id} className="NuoMenuPopupItem" onClick={() => item.onClick()}>{item.label}</li>)}
                </ul></div>
        </div>;
    }

    function listMenu(items: MenuItemsProps) {
        return items.map((item, index) => <Button
            data-testid={item.id}
            key={item.id}
            onClick={item.onClick}
        >
            {item.label}
        </Button>);
    }

    if (children) {
        return <>
            <div className="NuoMenuToggle" onClick={(event) => {
                setAnchor(event.currentTarget)
            }}><>{children}</></div>
            {popupMenu(items)}
        </>;
    }
    else {
        return <div className={className}>{listMenu(items)}</div>;
    }
}