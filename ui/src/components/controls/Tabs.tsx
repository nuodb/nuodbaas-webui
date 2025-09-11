// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import { ReactElement, ReactNode } from "react"

type TabProps = {
    id: string;
    label: string;
    children: ReactNode;
}

export function Tab({ children }: TabProps) {
    return <>{children}</>
}

type TabsProps = {
    children: ReactElement[];
    currentTab: number;
    setCurrentTab: (tab: number) => void;
    badges?: { [key: number]: number };
}

function badge(count: number) {
    return <div className="NuoBadge">{count < 0 ? "" : count}</div>
}

export function Tabs({ children, currentTab, setCurrentTab, badges }: TabsProps) {
    children = children.filter(child => child.props.id && child.props.label);

    return <div className="NuoTabs">
        <ul>{children.map((child, index) => (
            <li key={child.props.id} data-testid={child.props.id}
                tabIndex={index === currentTab && children.length > 1 ? 0 : undefined}
                className={index === currentTab ? "NuoTabsSelected" : ""}
                onClick={() => {
                    setCurrentTab(index);
                }}
                onKeyDown={(event) => {
                    if (event.key === 'ArrowLeft' && index > 0) {
                        event.preventDefault();
                        let previous = event.currentTarget.previousElementSibling as HTMLElement;
                        if (previous) {
                            setCurrentTab(index - 1);
                            previous.tabIndex = 0;
                            previous.focus();
                        }
                    }
                    else if (event.key === 'ArrowRight' && index + 1 < children.length) {
                        event.preventDefault();
                        let next = event.currentTarget.nextElementSibling as HTMLElement;
                        if (next) {
                            setCurrentTab(index + 1);
                            next.tabIndex = 0;
                            next.focus();
                        }
                    }
                }}
            >
                {child.props.label}{badges && (index in badges) && badge(badges[index])}
            </li>))}
            <li style={{ display: "flex", flex: "1 1 auto" }}></li>
        </ul>
        <div className="NuoTabsBody">
            {children[currentTab]}
        </div>
    </div>
}