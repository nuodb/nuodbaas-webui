// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import React, { Component, JSX, useEffect } from 'react';
import Button from './Button';

import MoreVertIcon from '@mui/icons-material/MoreVert';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import { MenuItemProps, MenuProps } from '../../utils/types';

export default function Menu(props: MenuProps): JSX.Element {
    const { popupId, items, className } = props;
    const dataTestid = props["data-testid"];

    useEffect(() => {
        PopupMenu.updateMenu(props)
    }, [props]);

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
                PopupMenu.toggleMenu(props, event.currentTarget);
            }}
            onKeyDown={(event) => {
                if (event.key === "Enter") {
                    PopupMenu.toggleMenu(props, event.currentTarget);
                }
            }}
        >
            <>{children}</>
        </div>;
    }
    else {
        return <div className={className}>{listMenu(items)}</div>;
    }
}

let s_popupInstance: PopupMenu | null = null;

type AlignType = "right" | "left";

interface PositionType {
    scrollX: number;
    scrollY: number;
    x: number;
    y: number;
    width: number;
    height: number;
}

interface PopupState extends MenuProps {
    dndSelected: any;
    anchor: Element | null;
    position?: PositionType;

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

export class PopupMenu extends Component<{}, PopupState> {
    state: PopupState = {
        popupId: "",
        items: [],
        setItems: undefined,
        selected: undefined,
        anchor: null,
        align: "right" as AlignType,
        draggable: false,
        dndSelected: undefined
    }



    handleScroll = () => {
        this.setState(prevState => {
            const position = prevState.position;
            if (!position) return null;

            return {
                position: {
                    scrollX: window.scrollX,
                    scrollY: window.scrollY,
                    x: position.x + (position.scrollX - window.scrollX),
                    y: position.y + (position.scrollY - window.scrollY),
                    width: position.width,
                    height: position.height
                }
            };
        });
    }

    componentDidMount() {
        if (!s_popupInstance) {
            s_popupInstance = this;
        }

        window.addEventListener("scroll", this.handleScroll);

    }

    componentWillUnmount() {
        window.removeEventListener("scroll", this.handleScroll);
    }

    dndIsBefore = (el1: any, el2: any) => {
        if (el2.parentNode === el1.parentNode) {
            let cur
            for (cur = el1.previousSibling; cur; cur = cur.previousSibling) {
                if (cur === el2) return true
            }
        }
        return false;
    }

    /* find given element target (or parent) which is draggable */
    dndGetDraggableTarget = (target: any) => {
        while (target.getAttribute("draggable") !== "true") {
            if (!target.parentElement) {
                return undefined;
            }
            target = target.parentElement;
        }
        return target;
    }

    dndOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const draggableTarget = this.dndGetDraggableTarget(e.target);
        if (!draggableTarget || !draggableTarget.parentNode) {
            return;
        }

        if (this.dndIsBefore(this.state.dndSelected, draggableTarget)) {
            draggableTarget.parentNode.insertBefore(this.state.dndSelected, draggableTarget)
        } else {
            draggableTarget.parentNode.insertBefore(this.state.dndSelected, draggableTarget.nextSibling)
        }
    }

    dndDrop = (e: React.DragEvent<HTMLDivElement>) => {
        this.setState({ dndSelected: undefined });
        const target = this.dndGetDraggableTarget(e.target);
        if (!target?.parentNode?.children) {
            return;
        }
        let newItems: MenuItemProps[] = [];
        Array.from(target.parentNode.children).forEach((child: any) => {
            const newItem = this.state.items.find((item: MenuItemProps) => item.id === child.getAttribute("id"));
            newItem && newItems.push(newItem);
        })
        if (this.state.setItems) {
            const setItems: ((items: MenuItemProps[]) => void) = this.state.setItems;
            setItems(newItems);
        }
    }

    dndStart = (e: any) => {
        const draggableTarget = this.dndGetDraggableTarget(e.target);
        if (!draggableTarget) {
            return;
        }

        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text', draggableTarget.getAttribute("id"))
        this.setState({ dndSelected: e.target });
    }

    static showMenu(menu: MenuProps, anchor: Element): void {
        const rect = anchor.getBoundingClientRect();
        const position: PositionType = {
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
    };
        s_popupInstance?.setState({
            "data-testid": undefined,
            align: undefined,
            popupId: undefined,
            draggable: undefined,
            children: undefined,
            setItems: undefined,
            selected: undefined,
            className: undefined,
            position,
            ...menu,
            anchor
        });
    }

    static toggleMenu(menu: MenuProps, anchor: Element): void {
        if (s_popupInstance?.state.anchor) {
            s_popupInstance.setState({ anchor: null });
        }
        else {
            this.showMenu(menu, anchor);
        }
    }

    static updateMenu(menu: MenuProps): void {
        if (s_popupInstance) {
            if (s_popupInstance.state.popupId === menu.popupId) {
                s_popupInstance.setState(menu);
            }
        }
    }

    render() {
        if (!this.state.anchor) {
            return null;
        }

        const anchor: Element = this.state.anchor;
        const rect = anchor.getBoundingClientRect();
        const x = this.state.align === "right" ? rect?.right : rect?.left;
        const maxHeight = this.state.position
    ? `${window.innerHeight - this.state.position.y - this.state.position.height - 5}px`
    : "auto";
        const width = this.state.position ? `${this.state.position.width}px` : "auto";
        return (
            <div
                style={{
                    justifyContent: this.state.align === "left" ? "start" : "end",
                    position: "fixed",
                    right: 0,
                    left: 0,
                    top: 0,
                    bottom: 0,
                    backgroundColor: "transparent",
                    zIndex: 101
                }}
                className="NuoMenuToggle"
                onClick={() => this.setState({ anchor: null })}
            >
                <div
                    style={{
                        position: "fixed",
                        top: rect.bottom,
                        left: this.state.align === "left" ? x : undefined,
                        right: this.state.align === "right" ? window.innerWidth - x : undefined,
                        zIndex: 102
                    }}
                >
                    <div
                        id="NuoMenuPopup"
                        data-testid="menu-popup"
                        className={
                            "NuoMenuPopup " +
                            (this.state.align === "right" ? " NuoAlignRight" : " NuoAlignLeft")
                        }
                        style={{
                            maxHeight: maxHeight,
                            overflowY: "auto",
                            padding: "0",
                            margin: "0",
                            width
                        }}
                    >
                        <MenuItems
                            items={this.state.items}
                            selected={this.state.selected}
                            draggable={this.state.draggable}
                            clearAnchor={() => this.setState({ anchor: null })}
                            dndDrop={this.dndDrop}
                            dndOver={this.dndOver}
                            dndStart={this.dndStart}
                        />
                    </div>
                </div>
            </div>
        );
    }
}