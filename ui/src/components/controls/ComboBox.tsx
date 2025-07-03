// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.
import React, { ReactNode, useEffect, useState } from "react";
import { MenuItemProps } from "../../utils/types";
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import MoreVertIcon from '@mui/icons-material/MoreVert';

type ComboBoxProps = {
    loadItems: (useCache: boolean) => Promise<MenuItemProps[]>;
    children: ReactNode;
    selected?: string;
    align?: "left" | "right"; //defaults to "left"
}

interface PositionType {
    scrollX: number,
    scrollY: number,
    x: number,
    y: number,
    width: number,
    height: number
}

type ComboBoxItemsProps = {
    items: MenuItemProps[];
    selected?: string;
    position: PositionType;
    setPosition: (position: PositionType | undefined) => void;
}

function ComboBoxItems({ items, position, setPosition, selected }: ComboBoxItemsProps) {
    const ref = items.map(() => React.createRef<HTMLDivElement | null>());
    useEffect(() => {
        for (let i = 0; i < items.length; i++) {
            if (items[i].id === selected) {
                ref[i].current?.focus();
                return;
            }
        }
    }, []);

    return items.map((item, index) => <div style={{ zIndex: 102, minWidth: position.width + "px" }}
        id={item.id}
        data-testid={item["data-testid"]}
        ref={ref[index]}
        key={item.id}
        className={"NuoMenuPopupItem" + (item.id === selected ? " NuoMenuSelected" : "")}
        onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (item.onClick) {
                setPosition(undefined);
                item.onClick();
            }
        }}
        tabIndex={0}
        onKeyDown={(event) => {
            if (event.key === "Escape") {
                event.stopPropagation();
                setPosition(undefined);
            }
            else if (event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                if (item.onClick) {
                    setPosition(undefined);
                    item.onClick();
                }
            }
            else if (event.key === "ArrowUp" && index > 0) {
                ref[index - 1].current?.focus();
            }
            else if (event.key === "ArrowDown" && index + 1 < ref.length) {
                ref[index + 1].current?.focus();
            }
            else if (event.key === "Tab") {
                if ((index === 0 && event.shiftKey) || (index + 1 === items.length && !event.shiftKey)) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            }
        }}>
        {item.label}
    </div>);
}

export default function ComboBox({ loadItems, children, selected, align }: ComboBoxProps) {
    const [position, setPosition] = useState<PositionType | undefined>();
    const [items, setItems] = useState<MenuItemProps[]>([]);

    if (!align) {
        align = "left";
    }
    if (!children) {
        children = <MoreVertIcon />
    }

    function handleScroll() {
        setPosition((position: PositionType | undefined) => {
            return position === undefined ? undefined : {
                scrollX: window.scrollX,
                scrollY: window.scrollY,
                x: position.x + (position.scrollX - window.scrollX),
                y: position.y + (position.scrollY - window.scrollY),
                width: position.width,
                height: position.height
            }
        })
    }

    useEffect(() => {
        window.addEventListener("scroll", handleScroll);
        loadItems(true).then(items => setItems(items));
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    function renderDropdown() {
        if (!position) {
            return null;
        }
        const x = (align === "right" ? position.x + position.width : position.x);
        return <div
            style={{
                justifyContent: align === "right" ? "end" : "start",
                position: "fixed",
                right: 0,
                left: 0,
                top: 0,
                bottom: 0,
                backgroundColor: "transparent",
                zIndex: 101
            }}
            className="NuoMenuToggle"
            onClick={(event) => {
                event.stopPropagation();
                setPosition(undefined);
            }}>
            <div style={{ position: "fixed", right: x, left: x, top: position.y, bottom: position.y, zIndex: 102 }}>
                <div id="NuoMenuPopup" data-testid="menu-popup" className={"NuoMenuPopup " + (align === "right" ? " NuoAlignRight" : " NuoAlignLeft")}
                    style={{ maxHeight: String(window.innerHeight - position.y - position.height - 5) + "px", overflowY: "auto", padding: "0", margin: "0" }}>
                    <div className="NuoComboBox"><div>{children}</div><UnfoldMoreIcon /></div>
                    <ComboBoxItems items={items} position={position} setPosition={setPosition} selected={selected} />
                </div></div>
        </div>;
    }

    function showPopup(event: React.MouseEvent<HTMLDivElement, MouseEvent> | React.KeyboardEvent<HTMLDivElement>) {
        event.stopPropagation();
        loadItems(false).then(items => {
            setItems(items);
        });
        const rect = event.currentTarget.getBoundingClientRect();
        setPosition({ scrollX: window.scrollX, scrollY: window.scrollY, x: rect.x, y: rect.y, width: rect.width, height: rect.height });
    }

    return <>{renderDropdown()}<div className="NuoComboBox" tabIndex={0} onClick={showPopup} onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === "ArrowDown") {
            showPopup(event);
        }
    }}><div>{children}</div><UnfoldMoreIcon /></div></>
}
