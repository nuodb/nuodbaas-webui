// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.
import { ReactNode, useEffect, useState } from "react";
import { MenuItemProps } from "../../utils/types";
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import MoreVertIcon from '@mui/icons-material/MoreVert';

type ComboBoxProps = {
    items: MenuItemProps[];
    children: ReactNode;
    className?: string;
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

export default function ComboBox({ items, children, selected, align, className }: ComboBoxProps) {
    const [position, setPosition] = useState<PositionType | undefined>();

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
                    <div className="NuoOrgSelector"><div>{children}</div><UnfoldMoreIcon /></div>
                    {items.map((item: MenuItemProps) => <div style={{ zIndex: 102, minWidth: position.width + "px" }}
                        id={item.id}
                        data-testid={item["data-testid"]}
                        key={item.id}
                        className={"NuoMenuPopupItem" + (item.id === selected ? " NuoMenuSelected" : "")}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (item.onClick) {
                                setPosition(undefined);
                                item.onClick();
                            }
                        }}>
                        {item.label}
                    </div>)}
                </div></div>
        </div>;
    }

    return <>{renderDropdown()}<div className={className} tabIndex={0} onClick={(event) => {
        event.stopPropagation();
        const rect = event.currentTarget.getBoundingClientRect();
        setPosition({ scrollX: window.scrollX, scrollY: window.scrollY, x: rect.x, y: rect.y, width: rect.width, height: rect.height });
    }}><div>{children}</div><UnfoldMoreIcon /></div></>
}
