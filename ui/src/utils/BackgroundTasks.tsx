// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React, { ReactNode } from "react";

export type StatusType = "not_started" | "in_progress" | "complete" | "canceled" | "error";
export type BackgroundTaskType = {
    id: string;
    label: string;
    description: string;
    data: any;
    status: StatusType;
    percent?: number;
    execute: (data: any) => Promise<any>;
    showMinimal: (task: BackgroundTaskType, tasks: BackgroundTaskType[], setTasks: React.Dispatch<React.SetStateAction<BackgroundTaskType[]>>) => ReactNode;
};

export type BackgroundTasksContextType = {
    tasks: BackgroundTaskType[];
    addBackgroundTask: (task: BackgroundTaskType) => void;
    execute: () => void;
}

type BackgroundTasksProps = {
    tasks: BackgroundTaskType[];
    setTasks: React.Dispatch<React.SetStateAction<BackgroundTaskType[]>>;
};

export function launchNextBackgroundTask(tasks: BackgroundTaskType[], setTasks: React.Dispatch<React.SetStateAction<BackgroundTaskType[]>>) {
    for (let i = 0; i < tasks.length; i++) {
        if (tasks[i].status === "not_started") {
            tasks[i].status = "in_progress";
            setTasks(tasks);
            tasks[i].execute(tasks[i]).then(task => {
                setTasks((previousTasks: BackgroundTaskType[]) => {
                    if (task.status === "in_progress") {
                        task.status = "complete";
                    }
                    let newTasks = [...previousTasks];
                    const taskIndex = newTasks.findIndex(t => t.id === task.id);
                    if (taskIndex != -1) {
                        newTasks[taskIndex] = task;
                    }
                    else {
                        console.log("ERROR: Task not found", newTasks, task);
                    }
                    launchNextBackgroundTask(newTasks, setTasks);
                    return newTasks;
                })
            });
            break;
        }
        else if (tasks[i].status === "in_progress") {
            break;
        }
    }
}

export function generateRandom() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    let hexString = '';
    for (let i = 0; i < bytes.length; i++) {
        hexString += bytes[i].toString(16).padStart(2, '0');
    }
    return hexString;
}

export function updateOrAddTask(tasks: BackgroundTaskType[], setTasks: React.Dispatch<React.SetStateAction<BackgroundTaskType[]>>, task: BackgroundTaskType) {
    setTasks((previousTasks) => {
        let tasks = [...previousTasks];
        for (let i = 0; i < tasks.length; i++) {
            if (tasks[i].id === task.id) {
                tasks[i] = task;
                return tasks;
            }
        }
        tasks.push(task);
        return tasks;
    });
}

export default function BackgroundTasks({ tasks, setTasks }: BackgroundTasksProps) {
        if (tasks.length === 0) {
            return null;
        }
    const summary = String(tasks.filter(task => task.status !== "not_started" && task.status !== "in_progress").length) + " of " + String(tasks.length) + " Tasks complete";
        return <details className="NuoBackgroundTasksStatus"><summary>{summary}</summary>
            {tasks.map(task => <div className="NuoRow" key={task.id}>{task.showMinimal(task, tasks, setTasks)}</div>)}
        </details>;
}
