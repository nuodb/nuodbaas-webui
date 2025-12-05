// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import React, { JSX, useEffect, useState } from 'react';
import Button from './Button';

import MoreVertIcon from '@mui/icons-material/MoreVert';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { MenuItemProps, MenuProps } from '../../utils/types';

export default function Menu(props: MenuProps): JSX.Element {
    const { popupId, items, className, defaultItem } = props;
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

    const mainItem = items.find(item => !!defaultItem && item.id === defaultItem);

    let { children } = props;
    if (popupId && !children) {
        if (mainItem) {
            children = <ArrowDropDownIcon />;
        }
        else {
            children = <MoreVertIcon />;
        }
    }

    if (children) {
        return <div className={mainItem && "NuoButtonDown"}>
            {mainItem && <button data-testid={mainItem["data-testid"]} onClick={mainItem.onClick}>
                <div className="NuoIcon">{mainItem.icon}</div>{mainItem.label}</button>}
            <div className="NuoRowFixed"
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
                <div className="NuoColumn">
                    {popupAnchor && <PopupMenu {...props} anchor={popupAnchor} clearAnchor={() => { setPopupAnchor(undefined) }} />}
                    <div className="NuoRow">
                        {mainItem && <div className="NuoColumn NuoRight" style={{ border: "1px solid #FFFFFF80" }}></div>}
                        <div className="NuoColumn NuoRight">{children}</div></div>
                </div>
            </div>
        </div>;
    }
    else {
        return <div className={className}>{listMenu(items)}</div>;
    }
}

interface PopupMenuProps extends MenuProps {
    anchor: Element;
    clearAnchor: () => void;
}

type MenuItemsProps = {
    items: MenuItemProps[];
    defaultItem?: string;
    setItems?: (items: MenuItemProps[]) => void;
    draggable?: boolean;
    selected?: string;
    clearAnchor: () => void;
    dndDrop: (event: React.DragEvent<HTMLDivElement>) => void;
    dndOver: (event: React.DragEvent<HTMLDivElement>) => void;
    dndStart: (e: any) => void;
};

function MenuItems({ items, setItems, defaultItem, draggable, selected, clearAnchor, dndDrop, dndOver, dndStart }: MenuItemsProps) {
    let refs = items.map(item => React.createRef<HTMLDivElement | null>());

    useEffect(() => {
        if (items.length > 0) {
            if (items[0].id !== "name") {
                refs[0].current?.focus();
            }
            else if (items.length > 1) {
                refs[1].current?.focus();
            }
        }
    }, []);

    return items.map((item: MenuItemProps, index: number) => <div style={{ zIndex: 102 }}
        id={item.id}
        data-testid={(defaultItem ? "popupmenu-" : "") + item["data-testid"]}
        ref={refs[index]}
        draggable={draggable && item.id !== "name"}
        onDrop={item.id === "name" ? undefined : dndDrop}
        onDragOver={dndOver}
        onDragStart={dndStart}
        key={item.id}
        className={"NuoMenuPopupItem" + (item.id === selected ? " NuoMenuSelected" : "")}
        tabIndex={item.id === "name" ? -1 : 0}
        onClick={(e) => {
            e.stopPropagation();
            if (item.onClick) {
                if (item.onClick()) {
                    clearAnchor();
                }

            }
        }}
        onKeyDown={(e) => {
            if (e.key === "Enter") {
                if (item.onClick) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (item.onClick()) {
                        clearAnchor();
                    }
                }
            }
            else if (e.key === "ArrowDown" && index + 1 < items.length) {
                if (index === 0 && items[0].id === "name") {
                    return;
                }
                if (e.metaKey && setItems) {
                    let newItems = [...items];
                    newItems[index] = items[index + 1];
                    newItems[index + 1] = items[index];
                    setItems(newItems);
                }
                else {
                refs[index + 1].current?.focus();
            }
            }
            else if (e.key === "ArrowUp" && index > 0) {
                if (index === 1 && items[0].id === "name") {
                    return;
                }
                if (e.metaKey && setItems) {
                    let newItems = [...items];
                    newItems[index] = items[index - 1];
                    newItems[index - 1] = items[index];
                    setItems(newItems);
                }
                else {
                    refs[index - 1].current?.focus();
                }
            }
            else if (e.key === "Tab" && (index === 0 && e.shiftKey || index + 1 === items.length && !e.shiftKey)) {
                e.preventDefault();
                e.stopPropagation();
            }
            else if (item.onKeyDown) {
                item.onKeyDown(e);
            }
        }}
    >
        <div className="NuoRowFixed"><div className="NuoIcon">{item.icon}</div>{item.label}</div>
        {draggable === true && (index !== 0 || items[0].id !== "name") && <DragHandleIcon /> || <div></div>}
    </div>);
}

export function PopupMenu(props: PopupMenuProps) {
    const [dndSelected, setDndSelected] = useState<any>(undefined);
    const [anchorRect, setAnchorRect] = useState(props.anchor.getBoundingClientRect());

    useEffect(() => {
        if (props.anchor) {
            setAnchorRect(props.anchor.getBoundingClientRect());
        }
    }, [props.anchor]);

    useEffect(() => {
        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        }
    }, []);

    function handleResize() {
        if (props.anchor) {
            setAnchorRect(props.anchor.getBoundingClientRect());
        }
    }

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

    return <div style={{ position: "absolute" }}>
        <div
            id="NuoMenuPopup"
            data-testid="menu-popup"
            className={"NuoMenuPopup " + (props.align === "right" ? " NuoAlignRight" : " NuoAlignLeft")}
            onKeyDown={(event) => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    props.clearAnchor();
                }
            }}
            style={{
                maxHeight: String(window.innerHeight - anchorRect.y - anchorRect.height - 5) + "px",
                top: anchorRect.height,
                right: -anchorRect.width,
                overflowY: "auto",
                padding: "2px 0",
                margin: "0",
                zIndex: 102
            }}>
            <MenuItems
                items={props.items}
                defaultItem={props.defaultItem}
                setItems={props.setItems}
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