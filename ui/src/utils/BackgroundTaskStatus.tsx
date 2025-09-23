// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import { BackgroundTaskType } from "./BackgroundTasks";
import CheckIcon from '@mui/icons-material/Check';
import CancelIcon from '@mui/icons-material/Cancel';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CircularProgress from "@mui/material/CircularProgress";
import CircularProgressWithLabel from "../components/controls/CircularProgressWithLabel";
import Button from "../components/controls/Button";
import { t } from "i18next";

type BackgroundTaskStatusProps = {
    task: BackgroundTaskType;
    tasks: BackgroundTaskType[];
    setTasks: React.Dispatch<React.SetStateAction<BackgroundTaskType[]>>;
    abortController?: AbortController;
};

export function BackgroundTaskStatusIcon({ task }: { task: BackgroundTaskType }) {
    let statusIcon = null;
    if (task.status === "not_started") {
        statusIcon = <HourglassEmptyIcon />;
    }
    else if (task.status === "complete") {
        statusIcon = <CheckIcon />;
    }
    else if (task.status === "canceled") {
        statusIcon = <CancelIcon />;
    }
    else if (task.status === "error") {
        statusIcon = <ErrorIcon />
    }
    else if (task.status === "in_progress") {
        if (task.percent) {
            statusIcon = <CircularProgressWithLabel variant="indeterminate" size="30px" value={task.percent} />;
        }
        else {
            statusIcon = <CircularProgress variant="indeterminate" size="30px" />;
        }
    }
    return statusIcon;
}

export function BackgroundTaskStatusButton({ task, tasks, setTasks, abortController }: BackgroundTaskStatusProps) {
    return <Button variant="text" onClick={() => {
        if (task.status === "in_progress") {
            abortController?.abort();
        }
        else {
            const newTasks = tasks.filter((t: BackgroundTaskType) => t.id != task.id);
            setTasks(newTasks);
        }
    }}>
        {(task.status === "complete" || task.status === "canceled" || task.status === "error") && t("button.dismiss")}
        {task.status === "in_progress" && t("button.cancel")}
        {task.status === "not_started" && t("button.cancel")}
    </Button>

}

export default function BackgroundTaskStatus({ task, tasks, setTasks, abortController }: BackgroundTaskStatusProps) {

    if (!abortController && task.status === "in_progress") {
        return <div className="NuoRow"><BackgroundTaskStatusIcon task={task} /></div>
    }

    return <div className="NuoRow">
        <BackgroundTaskStatusIcon task={task} />
        <BackgroundTaskStatusButton task={task} tasks={tasks} setTasks={setTasks} abortController={abortController} />
    </div>;
}