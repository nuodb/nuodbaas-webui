// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React, { createContext, ReactNode } from "react";

export type StatusType = "Not Started" | "In Progress" | "Complete";
type BackgroundTaskType = {
    label: string;
    data: any;
    status: StatusType;
    execute: (data: any) => Promise<void>;
    show: (data: any) => ReactNode;
    showMinimal: (data:any) => ReactNode;
    children: ReactNode;
}

export function addBackgroundTask() {

}

export const BackgroundTasks = createContext<BackgroundTaskType[]>([]);