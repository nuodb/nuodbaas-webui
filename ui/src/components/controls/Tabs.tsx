// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { ReactElement, ReactNode, useState } from "react"

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
}

export function Tabs({ children }: TabsProps) {
    children = children.filter(child => child.props.id && child.props.label && child.props.children);
    const [currentTab, setCurrentTab] = useState<number>(0);

    return <div className="NuoTabs">
        <ul>{children.map((child, index) => (
            <li key={child.props.id} data-testid={child.props.id}
                className={index === currentTab ? "NuoTabsSelected" : ""}
                onClick={() => {
                    setCurrentTab(index);
                }}
            >
                {child.props.label}
            </li>))}
            <li style={{ display: "flex", flex: "1 1 auto" }}></li>
        </ul>
        <div className="NuoTabsBody">
            {children[currentTab]}
        </div>
    </div>
}