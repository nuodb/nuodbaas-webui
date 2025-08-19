// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import { BackgroundTaskType } from "./BackgroundTasks";
import CheckIcon from '@mui/icons-material/Check';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CircularProgress from "@mui/material/CircularProgress";
import CircularProgressWithLabel from "../components/controls/CircularProgressWithLabel";
import Button from "../components/controls/Button";

type BackgroundTasksStatusProps = {
    task: BackgroundTaskType;
    tasks: BackgroundTaskType[];
    setTasks: React.Dispatch<React.SetStateAction<BackgroundTaskType[]>>;
};

export default function BackgroundTasksStatus({task, tasks, setTasks}:BackgroundTasksStatusProps) {
    let statusIcon = null;
    if (task.status === "not_started") {
        statusIcon = <HourglassEmptyIcon />;
    }
    else if (task.status === "complete") {
        statusIcon = <CheckIcon />;
    }
    else if (task.status === "in_progress") {
        if (task.percent) {
            statusIcon = <CircularProgressWithLabel variant="indeterminate" size="30px" value={task.percent} />;
        }
        else {
            statusIcon = <CircularProgress variant="indeterminate" size="30px" />;
        }
    }

    return <div className="NuoRow">
        {statusIcon}
        <Button variant="text" onClick={() => {
            if (task.status === "complete" || task.status === "not_started") {
                const newTasks = tasks.filter((t: BackgroundTaskType) => t.id != task.id);
                console.log("STATUS", newTasks, tasks);
                setTasks(newTasks);
            }
        }}>
            {task.status === "complete" && "Dismiss"}
            {task.status === "in_progress" && "Cancel"}
            {task.status === "not_started" && "Cancel"}
        </Button>
    </div>;
}