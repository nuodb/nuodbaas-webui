// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React, { useState } from 'react';
import { withTranslation } from "react-i18next";
import { t } from 'i18next';
import { SqlImportResponseType, SqlType } from '../../../utils/SqlSocket';
import TextField from '../../controls/TextField';
import { BackgroundTaskType, generateRandom, launchNextBackgroundTask, updateOrAddTask } from '../../../utils/BackgroundTasks';
import BackgroundTaskStatus from '../../../utils/BackgroundTaskStatus';
import { TaskSharp } from '@mui/icons-material';

type SqlExportTabProps = {
    tasks: BackgroundTaskType[];
    setTasks: React.Dispatch<React.SetStateAction<BackgroundTaskType[]>>;
    sqlConnection: SqlType;
    dbTable: string;
}

function nowYYYYMMDD_HHMMSS() {
    function twoDigits(value:number) {
        if(value < 10) {
            return "0" + String(value);
        }
        else {
            return String(value);
        }
    }

    const now = new Date();
    return now.getUTCFullYear() +
        twoDigits(now.getUTCMonth() + 1) +
        twoDigits(now.getUTCDate()) + "_" +
        twoDigits(now.getUTCHours()) +
        twoDigits(now.getUTCMinutes()) +
        twoDigits(now.getUTCSeconds());
}

const TASK_ID_PREFIX = "sqlexport_";

async function exportFile(sqlConnection: SqlType, exportOptions: ExportOptionsType, tasks: BackgroundTaskType[], setTasks: React.Dispatch<React.SetStateAction<BackgroundTaskType[]>>) : Promise<string> {
    const url = new URL(location.protocol + location.host + "/api/sql/export/sql" + sqlConnection.getOrgProjDbSchemaUrl());
    if(exportOptions.includeDdl) {
        url.searchParams.append("includeDdl", "true");
    }
    if(exportOptions.includeData) {
        url.searchParams.append("includeData", "true");
    }
    if(exportOptions.includeDrop) {
        url.searchParams.append("includeDrop", "true");
    }
    if(exportOptions.batchSize) {
        url.searchParams.append("batchSize", String(exportOptions.batchSize));
    }
    if(exportOptions.exportLimit) {
        url.searchParams.append("exportLimit", String(exportOptions.exportLimit));
    }
    if(exportOptions.outputSchema) {
        url.searchParams.append("outputSchema", exportOptions.outputSchema);
    }
    if(exportOptions.outputTable) {
        url.searchParams.append("outputTable", exportOptions.outputTable);
    }

    const showSaveFilePicker = (window as any).showSaveFilePicker;
    if(!showSaveFilePicker) {
        return Promise.reject("Streamed download not supported");
    }
    const fileHandle: FileSystemFileHandle = (await (window as any).showSaveFilePicker({
        startIn: "downloads",
        suggestedName: sqlConnection.getOrgProjDbSchemaUrl().substring("/".length).replaceAll("/","_") + "_" + nowYYYYMMDD_HHMMSS() + ".sql"
    })) as FileSystemFileHandle;

    let progressAbortController = new AbortController();
    let newTask: BackgroundTaskType = {
        id: TASK_ID_PREFIX + generateRandom(),
        label: "Exporting " + sqlConnection.getOrgProjDbSchemaUrl(),
        status: "not_started",
        description: "Exporting " + sqlConnection.getOrgProjDbSchemaUrl(),
        data: { downloaded: 0},
        execute: async (task: BackgroundTaskType) => {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Authorization": "Basic " + btoa(sqlConnection.getDbUsername() + ":" + sqlConnection.getDbPassword())
                },
                signal: progressAbortController.signal
            });
            const writableStream = await fileHandle.createWritable();
            if(!response.body) {
                return Promise.reject("Unable to get data");
            }
            try {
                const reader = response.body.getReader();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    await writableStream.write(value);
                    let t = {...task};
                    t.data.downloaded += value.byteLength;
                    updateOrAddTask(tasks, setTasks, t);
                    await new Promise((resolve, reject)=>{
                        setInterval(()=>resolve(""), 100);
                    })
                }
                await writableStream.close();
            }
            catch(error) {
                task = { ...task };
                if ((error as any).name === "AbortError") {
                    task.status = "canceled";
                    progressAbortController?.abort();
                }
                else {
                    task.status = "error";
                    console.log("ERROR", error);
                }
            }

            task = { ...task };
            // task.status = "canceled";
            // task.status = "error";
            return task;
        },
        showMinimal: (task: BackgroundTaskType, tasks: BackgroundTaskType[], setTasks: React.Dispatch<React.SetStateAction<BackgroundTaskType[]>>) => {
            return <div key={task.label} className="NuoRow">
                <div className="NuoRow">{task.label} {task.data.downloaded}</div>
                <div className="NuoRowFixed"><BackgroundTaskStatus task={task} tasks={tasks} setTasks={setTasks} abortController={progressAbortController} /></div>
            </div>;
        },
    };
    setTasks([...tasks, newTask]);
    launchNextBackgroundTask([...tasks, newTask], setTasks);
    return Promise.resolve("");
}

type ExportOptionsType = {
    includeDdl?: boolean;
    includeData?: boolean;
    includeDrop?: boolean;
    table?: string;
    outputTable?: string;
    outputSchema?: string;
    batchSize?: number; /* default 500 */
    exportLimit?: number; /* default 0 */
};

function SqlExportTab({ tasks, setTasks, sqlConnection, dbTable}: SqlExportTabProps) {
    const [exportOptions, setExportOptions] = useState<ExportOptionsType>({
        includeDdl: true,
        includeData: true
    });
    return <><form>
        <div className="NuoColumn NuoFieldContainer NuoCenter">
            <label>
                <input type="checkbox" checked={exportOptions.includeDdl} onChange={() => {
                    setExportOptions({...exportOptions, includeDdl: !exportOptions.includeDdl});
                }} />
                includeDdl
            </label>
            <label>
                <input type="checkbox" checked={exportOptions.includeData} onChange={() => {
                    setExportOptions({...exportOptions, includeData: !exportOptions.includeData});
                }} />
                includeData
            </label>
            <label>
                <input type="checkbox" checked={exportOptions.includeDrop} onChange={() => {
                    setExportOptions({...exportOptions, includeDrop: !exportOptions.includeDrop});
                }} />
                includeDrop
            </label>
            <TextField id="table" label="table" value={exportOptions.table || ""} onChange={(event)=>{
                setExportOptions({...exportOptions, table: event.currentTarget.value});
            }}/>
            <TextField id="outputTable" label="outputTable" value={exportOptions.outputTable || ""} onChange={(event)=>{
                setExportOptions({...exportOptions, outputTable: event.currentTarget.value});
            }}/>
            <TextField id="outputSchema" label="outputSchema" value={exportOptions.outputSchema || ""} onChange={(event)=>{
                setExportOptions({...exportOptions, outputSchema: event.currentTarget.value});
            }}/>
            <TextField id="batchSize" label="batchSize" value={String(exportOptions.batchSize || "")} onChange={(event)=>{
                if(event.currentTarget.value === "") {
                    setExportOptions({...exportOptions, batchSize: undefined});
                }
                else {
                    const num = Number(event.currentTarget.value);
                    if(!isNaN(num)) {
                        setExportOptions({...exportOptions, batchSize: num});
                    }
                }
            }}/>
            <TextField id="exportLimit" label="exportLimit" value={String(exportOptions.exportLimit || "")} onChange={(event)=>{
                if(event.currentTarget.value === "") {
                    setExportOptions({...exportOptions, exportLimit: undefined});
                }
                else {
                    const num = Number(event.currentTarget.value);
                    if(!isNaN(num)) {
                        setExportOptions({...exportOptions, exportLimit: num});
                    }
                }
            }}/>

            <div className="NuoRow">
                {(window as any).showOpenFilePicker && <button onClick={async (event)=>{
                    event.preventDefault();
                    await exportFile(sqlConnection, exportOptions, tasks, setTasks);
                }}>Export</button>}
            </div>
            <div>
                {tasks.filter(t=>t.id.startsWith(TASK_ID_PREFIX)).map(task=>task.showMinimal(task, tasks, setTasks))}
            </div>
        </div>
    </form>
    </>;
}

export default withTranslation()(SqlExportTab);
