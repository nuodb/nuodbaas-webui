// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { ReactNode, useState } from 'react';
import Button from './Button';

import { PopupMenuIcon } from "../../resources/icons/PopupMenuIcon";

type MenuItemProps = {
    id: string,
    label: ReactNode,
    onClick?: () => void
}

type MenuProps = {
    "data-testid"?: string,
    align?: "left" | "right",
    popup?: boolean,
    draggable?: boolean,
    children?: ReactNode,
    items: MenuItemProps[],
    setItems?: (items: MenuItemProps[]) => void,
    className?: string
};

export default function Menu(props: MenuProps): JSX.Element {
    const { align, popup, items, setItems, className, draggable } = props;
    const [anchor, setAnchor] = useState<Element | null>(null);
    const [dndSelected, setDndSelected] = useState();

    function dndIsBefore(el1: any, el2: any) {
        let cur
        if (el2.parentNode === el1.parentNode) {
            for (cur = el1.previousSibling; cur; cur = cur.previousSibling) {
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
        let newItems: any[] = [];
        Array.from(target.parentNode.children).forEach((child: any) => {
            console.log("child", child);
            newItems.push(items.find(item => item.id === child.getAttribute("id")));
        })
        if (setItems) {
            console.log(items, newItems);
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

    function popupMenu(items: MenuItemProps[]) {
        const rect = anchor?.getBoundingClientRect();
        const x = align === "right" ? rect?.right : rect?.left;
        return <div style={{ display: anchor ? "block" : "none", position: "fixed", right: 0, left: 0, top: 0, bottom: 0, backgroundColor: "transparent", zIndex: 1 }} onClick={() => setAnchor(null)}>
            <div style={{ position: "absolute", right: x, left: x, top: rect?.bottom, bottom: rect?.bottom }}>
                <div id="NuoMenuPopup" className={"NuoMenuPopup " + (align === "right" ? " NuoAlignRight" : " NuoAlignLeft")}>
                    {items.map(item => <div
                        id={item.id}
                        draggable={draggable}
                        onDrop={dndDrop}
                        onDragOver={dndOver}
                        onDragStart={dndStart}
                        key={item.id}
                        className="NuoMenuPopupItem"
                        onClick={() => item.onClick && item.onClick()}>
                        {item.label}
                    </div>)}
                </div></div>
        </div>;
    }

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
    if (popup && !children) {
        children = <PopupMenuIcon />
    }

    if (children) {
        return <>
            <div style={{ display: "flex", justifyContent: align === "left" ? "start" : "end" }} className="NuoMenuToggle" onClick={(event) => {
                setAnchor(event.currentTarget)
            }}><>{children}</></div>
            {popupMenu(items)}
        </>;
    }
    else {
        return <div className={className}>{listMenu(items)}</div>;
    }
}