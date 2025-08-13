// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import CircularProgress from "@mui/material/CircularProgress";
import React, { Component, createContext, ReactNode, useContext } from "react";
import CheckIcon from '@mui/icons-material/Check';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

export type StatusType = "not_started" | "in_progress" | "complete";
export type BackgroundTaskType = {
    listenerId: string;
    label: string;
    description: string;
    data: any;
    status: StatusType;
    execute: (data: any) => Promise<any>;
    show: (data: any) => ReactNode;
};

export type BackgroundTasksContextType = {
    tasks: BackgroundTaskType[];
    addBackgroundTask: (task: BackgroundTaskType) => void;
    execute: () => void;
}

interface IProps {
}

type ListenerCallback = (tasks: BackgroundTaskType[]) => void;

interface IState {
    tasks: BackgroundTaskType[];
    listeners: { [key: number]: ListenerCallback };
}

let s_instance: BackgroundTasks | undefined = undefined;
let listenerIndex = 0;

function tasksUpdatedCallback() {
    if (!s_instance) {
        return;
    }
    BackgroundTasks.launch();
    const listeners: ListenerCallback[] = Object.values(s_instance.state.listeners);
    listeners.forEach(listener => {
        if (s_instance) {
            listener(s_instance.state.tasks);
        }
    });
}
export default class BackgroundTasks extends Component<IProps, IState> {
    state = {
        tasks: [],
        listeners: {}
    }

    componentDidMount() {
        s_instance = this;
    }

    static getTasks(): BackgroundTaskType[] {
        if (!s_instance) {
            return [];
        }
        return s_instance.state.tasks;
    }

    static addTasks(newTasks: BackgroundTaskType[]) {
        if (!s_instance) {
            return;
        }
        const tasks = [...s_instance?.state.tasks, ...newTasks];
        s_instance.setState({ tasks }, tasksUpdatedCallback);
    }

    static addListener(listener: ListenerCallback): number {
        if (!s_instance) {
            return -1;
        }
        s_instance.setState({ listeners: { ...s_instance.state.listeners, [listenerIndex++]: listener } });
        return listenerIndex;
    }

    static removeListener(index: number) {
        if (!s_instance) {
            return;
        }
        let newListeners: { [key: number]: ListenerCallback } = { ...s_instance.state.listeners };
        delete newListeners[index];
    }

    static launch() {
        if (!s_instance) {
            return;
        }
        const tasks: BackgroundTaskType[] = s_instance.state.tasks
        for (let i = 0; i < tasks.length; i++) {
            if (tasks[i].status === "not_started") {
                tasks[i].status = "in_progress";
                s_instance.setState({ tasks }, tasksUpdatedCallback);
                console.log("EXECUTE", i, tasks[i]);
                tasks[i].execute(tasks[i].data).then(data => {
                    console.log("finished", i, tasks[i]);
                    tasks[i].data = data;
                    tasks[i].status = "complete";
                    s_instance?.setState({ tasks }, tasksUpdatedCallback);
                })
                break;
            }
            else if (tasks[i].status === "in_progress") {
                break;
            }
        }
    }

    render() {
        let tasks: BackgroundTaskType[] = this.state.tasks;
        if (tasks.length === 0) {
            return null;
        }
        const summary = String(tasks.filter(task => task.status === "complete").length) + " of " + String(tasks.length) + " Tasks complete";
        return <details className="NuoBackgroundTasksStatus"><summary>{summary}</summary>
            {tasks.map(task => <div>
                {task.label}
                {task.status === "not_started" && <HourglassEmptyIcon />}
                {task.status === "in_progress" && <CircularProgress size="30px" />}
                {task.status === "complete" && <CheckIcon />}
            </div>)}
        </details>;
    }
}
