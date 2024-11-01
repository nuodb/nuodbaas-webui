// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { Component, useEffect } from 'react';
import Button from './Button';

import MoreVertIcon from '@mui/icons-material/MoreVert';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import { MenuItemProps, MenuProps } from '../../utils/types';

export default function Menu(props: MenuProps): JSX.Element {
    const { popupId, items, className } = props;

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
        return <>
            <div onClick={(event) => {
                PopupMenu.showMenu(props, event.currentTarget)
            }}>
                <>{children}</>
            </div>
        </>;
    }
    else {
        return <div className={className}>{listMenu(items)}</div>;
    }
}

let s_popupInstance: PopupMenu | null = null;

type AlignType = "right" | "left";

interface PopupState extends MenuProps {
    dndSelected: any;
    anchor: Element | null;
}

export class PopupMenu extends Component<{}, PopupState> {
    state = {
        popupId: "",
        items: [],
        setItems: undefined,
        anchor: null,
        align: "right" as AlignType,
        draggable: false,

        dndSelected: undefined
    }

    componentDidMount() {
        if (!s_popupInstance) {
            s_popupInstance = this;
        }
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
        s_popupInstance?.setState({
            "data-testid": undefined,
            align: undefined,
            popupId: undefined,
            draggable: undefined,
            children: undefined,
            setItems: undefined,
            className: undefined,
            ...menu,
            anchor
        });
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
        return <div
            data-testid="menu-toggle"
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
            onClick={() => this.setState({ anchor: null })}>
            <div style={{ position: "fixed", right: x, left: x, top: rect?.bottom, bottom: rect?.bottom, zIndex: 102 }}>
                <div id="NuoMenuPopup" className={"NuoMenuPopup " + (this.state.align === "right" ? " NuoAlignRight" : " NuoAlignLeft")}>
                    {this.state.items.map((item: MenuItemProps) => <div style={{ zIndex: 102 }}
                        id={item.id}
                        data-testid={item["data-testid"]}
                        draggable={this.state.draggable}
                        onDrop={this.dndDrop}
                        onDragOver={this.dndOver}
                        onDragStart={this.dndStart}
                        key={item.id}
                        className="NuoMenuPopupItem"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (item.onClick) {
                                this.setState({ anchor: null });
                                item.onClick();

                            }
                        }}>
                        {item.label}
                        {this.state.draggable === true && <DragHandleIcon />}
                    </div>)}
                </div></div>
        </div>;
    }
}