// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import React, { JSX, useEffect, useState } from 'react';
import Button from './Button';

import MoreVertIcon from '@mui/icons-material/MoreVert';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import { MenuItemProps, MenuProps } from '../../utils/types';

export default function Menu(props: MenuProps): JSX.Element {
    const { popupId, items, className } = props;
    const dataTestid = props["data-testid"];
    const [popupAnchor, setPopupAnchor] = useState<Element | undefined>(undefined);

    function listMenu(items: MenuItemProps[]) {
        return items.map((item, index) => <Button
            data-testid={item.id}
            key={item.id}
            onClick={() => item.onClick && item.onClick()}
        >
            {item.label}
        </Button>);
    }

    let { children } = props;
    if (popupId && !children) {
        children = <MoreVertIcon />
    }

    if (children) {
        return <div
            tabIndex={0}
            data-testid={dataTestid}
            onClick={(event) => {
                setPopupAnchor(event.currentTarget);
            }}
            onKeyDown={(event) => {
                if (event.key === "Enter") {
                    setPopupAnchor(event.currentTarget);
                }
            }}
        >

            <div >
                {popupAnchor && <PopupMenu {...props} anchor={popupAnchor} clearAnchor={() => { setPopupAnchor(undefined) }} />}
                {children}
            </div>
        </div>;
    }
    else {
        return <div className={className}>{listMenu(items)}</div>;
    }
}

type AlignType = "right" | "left";

interface PopupMenuProps extends MenuProps {
    anchor: Element | undefined;
    clearAnchor: () => void;
}

type MenuItemsProps = {
    items: MenuItemProps[];
    draggable?: boolean;
    selected?: string;
    clearAnchor: () => void;
    dndDrop: (event: React.DragEvent<HTMLDivElement>) => void;
    dndOver: (event: React.DragEvent<HTMLDivElement>) => void;
    dndStart: (e: any) => void;
};

function MenuItems({ items, draggable, selected, clearAnchor, dndDrop, dndOver, dndStart }: MenuItemsProps) {
    let refs = items.map(item => React.createRef<HTMLDivElement | null>());

    useEffect(() => {
        if (items.length > 0) {
            refs[0].current?.focus();
        }
    }, []);

    return items.map((item: MenuItemProps, index: number) => <div style={{ zIndex: 102 }}
        id={item.id}
        data-testid={item["data-testid"]}
        ref={refs[index]}
        draggable={draggable}
        onDrop={dndDrop}
        onDragOver={dndOver}
        onDragStart={dndStart}
        key={item.id}
        className={"NuoMenuPopupItem" + (item.id === selected ? " NuoMenuSelected" : "")}
        tabIndex={0}
        onClick={(e) => {
            e.stopPropagation();
            if (item.onClick) {
                clearAnchor();
                item.onClick();

            }
        }}
        onKeyDown={(e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                if (item.onClick) {
                    clearAnchor();
                    item.onClick();
                }
            }
            else if (e.key === "ArrowDown" && index + 1 < items.length) {
                refs[index + 1].current?.focus();
            }
            else if (e.key === "ArrowUp" && index > 0) {
                refs[index - 1].current?.focus();
            }
            else if (e.key === "Tab" && (index === 0 && e.shiftKey || index + 1 === items.length && !e.shiftKey)) {
                e.preventDefault();
                e.stopPropagation();
            }
        }}
    >
        {item.label}
        {draggable === true && <DragHandleIcon />}
    </div>);
}

export function PopupMenu(props: PopupMenuProps) {
    const [dndSelected, setDndSelected] = useState<any>(undefined);

    function dndIsBefore(el1: any, el2: any) {
        if (el2.parentNode === el1.parentNode) {
            for (let cur = el1.previousSibling; cur; cur = cur.previousSibling) {
                if (cur === el2) return true
            }
        }
        return false;
    }

    /* find given element target (or parent) which is draggable */
    function dndGetDraggableTarget(target: any) {
        while (target.getAttribute("draggable") !== "true") {
            if (!target.parentElement) {
                return undefined;
            }
            target = target.parentElement;
        }
        return target;
    }

    function dndOver(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        const draggableTarget = dndGetDraggableTarget(e.target);
        if (!draggableTarget || !draggableTarget.parentNode) {
            return;
        }

        if (dndIsBefore(dndSelected, draggableTarget)) {
            draggableTarget.parentNode.insertBefore(dndSelected, draggableTarget)
        } else {
            draggableTarget.parentNode.insertBefore(dndSelected, draggableTarget.nextSibling)
        }
    }

    function dndDrop(e: React.DragEvent<HTMLDivElement>) {
        setDndSelected(undefined);
        const target = dndGetDraggableTarget(e.target);
        if (!target?.parentNode?.children) {
            return;
        }
        let newItems: MenuItemProps[] = [];
        Array.from(target.parentNode.children).forEach((child: any) => {
            const newItem = props.items.find((item: MenuItemProps) => item.id === child.getAttribute("id"));
            newItem && newItems.push(newItem);
        })
        if (props.setItems) {
            const setItems: ((items: MenuItemProps[]) => void) = props.setItems;
            setItems(newItems);
        }
    }

    function dndStart(e: any) {
        const draggableTarget = dndGetDraggableTarget(e.target);
        if (!draggableTarget) {
            return;
        }

        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text', draggableTarget.getAttribute("id"))
        setDndSelected(e.target);
    }

    if (!props.anchor) {
        return null;
    }

    const anchor: Element = props.anchor;
    const rect = anchor.getBoundingClientRect();
    return <div style={{ position: "absolute" }}>
        <div id="NuoMenuPopup" data-testid="menu-popup" className={"NuoMenuPopup " + (props.align === "right" ? " NuoAlignRight" : " NuoAlignLeft")}
            style={{
                maxHeight: String(window.innerHeight - rect.y - rect.height - 5) + "px",
                top: rect.height,
                right: -rect.width,
                overflowY: "auto",
                padding: "0",
                margin: "0",
                zIndex: 102
            }}>
            <MenuItems
                items={props.items}
                selected={props.selected}
                draggable={props.draggable}
                clearAnchor={props.clearAnchor}
                dndDrop={dndDrop}
                dndOver={dndOver}
                dndStart={dndStart} />
        </div>
        <div
            style={{
                justifyContent: props.align === "left" ? "start" : "end",
                position: "fixed",
                right: 0,
                left: 0,
                top: 0,
                bottom: 0,
                backgroundColor: "transparent",
                zIndex: 101
            }}
            className="NuoMenuToggle"
            onClick={(event) => { event.stopPropagation(); props.clearAnchor(); }}>
        </div>
    </div>;
}