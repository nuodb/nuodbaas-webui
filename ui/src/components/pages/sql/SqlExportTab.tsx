// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React, { useEffect, useState } from 'react';
import { withTranslation } from "react-i18next";
import { t } from 'i18next';
import TextField from '../../controls/TextField';
import { BackgroundTaskType, generateRandom, isTaskFinished, launchNextBackgroundTask, shortenSize, updateOrAddTask } from '../../../utils/BackgroundTasks';
import BackgroundTaskStatus, { BackgroundTaskStatusButton, BackgroundTaskStatusIcon } from '../../../utils/BackgroundTaskStatus';
import Toast from '../../controls/Toast';
import Select, { SelectOption } from '../../controls/Select';
import DialogMaterial from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '../../controls/Button';
import { SqlType } from '../../../utils/SqlSocket';

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
const ALL_TABLES = "___all_tables___";

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

function SqlExportTab({ tasks, setTasks, sqlConnection, dbTable }: SqlExportTabProps) {

    const [exportOptions, setExportOptions] = useState<ExportOptionsType>({
        includeDdl: true,
        includeData: true,
    });
    const [tables, setTables] = useState<string[]>([]);
    const [foregroundTaskId, setForegroundTaskId] = useState<string | undefined>(undefined);

    useEffect(() => {
        sqlConnection.runCommand("EXECUTE_QUERY", ["SELECT tablename FROM system.tables where type = 'TABLE' and schema = '" + sqlConnection.getDefaultSchema() + "'"])
            .then(results => {
                if (results.error) {
                    Toast.show(results.error, results);
                }
                else if (results.rows) {
                    const tables = results.rows.map(row => row.values[0]);
                    setTables(tables);
                    if (tables.includes(dbTable)) {
                        setExportOptions({ ...exportOptions, table: dbTable });
                    }
                }
            });
    }, []);

    function renderForegroundTask() {
        if (!foregroundTaskId) {
            return null;
        }
        const task = tasks.find(t => t.id === foregroundTaskId);
        if (!task) {
            return null;
        }

        return <DialogMaterial open={true}>
            <DialogTitle>{task.label}</DialogTitle>
            <DialogContent>
                <div className="NuoColumn" style={{ alignItems: "center" }}>
                    <div>{shortenSize(task.data.downloaded)} {isTaskFinished(task) ? "downloaded" : "downloaded so far"}</div>
                    <div className="NuoColumn"><BackgroundTaskStatusIcon task={task} /></div>
                </div>
            </DialogContent>
            <DialogActions>
                <Button data-testid="export.status.button" variant="text" onClick={() => {
                    if (task.status === "in_progress") {
                        task.data.progressAbortController?.abort();
                    }
                    const newTasks = tasks.filter((t: BackgroundTaskType) => t.id != task.id);
                    setTasks(newTasks);
                }}>
                    {isTaskFinished(task) && "Dismiss" || "Cancel"}
                </Button>
                {!isTaskFinished(task) && <Button onClick={() => {
                    setForegroundTaskId(undefined);
                }}>
                    Export in Background
                </Button>
                }
            </DialogActions>
        </DialogMaterial>
    }

    function fakeShowSaveFilePicker() {
        localStorage.setItem("downloadedFile", "");
        return Promise.resolve({
            createWritable: () => {
                return Promise.resolve({
                    write: (value: Uint8Array<ArrayBufferLike>): Promise<void> => {
                        localStorage.setItem("downloadedFile", (localStorage.getItem("downloadedFile") || "") + (new TextDecoder('utf-8')).decode(value));
                        return Promise.resolve();
                    },
                    close: () => { }
                });
            }
        });
    }

    async function exportFile(sqlConnection: SqlType, exportOptions: ExportOptionsType): Promise<string> {
        const url = new URL(location.protocol + location.host + "/api/sql/export/sql" + sqlConnection.getOrgProjDbSchemaUrl());
        if (exportOptions.includeDdl) {
            url.searchParams.append("includeDdl", "true");
        }
        if (exportOptions.includeData) {
            url.searchParams.append("includeData", "true");
        }
        if (exportOptions.includeDrop) {
            url.searchParams.append("includeDrop", "true");
        }
        if (exportOptions.table) {
            url.searchParams.append("table", exportOptions.table);
        }
        if (exportOptions.batchSize) {
            url.searchParams.append("batchSize", String(exportOptions.batchSize));
        }
        if (exportOptions.exportLimit) {
            url.searchParams.append("exportLimit", String(exportOptions.exportLimit));
        }
        if (exportOptions.outputSchema) {
            url.searchParams.append("outputSchema", exportOptions.outputSchema);
        }
        if (exportOptions.outputTable) {
            url.searchParams.append("outputTable", exportOptions.outputTable);
        }

        const showSaveFilePicker = localStorage.getItem("selenium") === "true" ? fakeShowSaveFilePicker : (window as any).showSaveFilePicker;
        if (!showSaveFilePicker) {
            return Promise.reject("Streamed download not supported");
        }
        const fileHandle: FileSystemFileHandle = await showSaveFilePicker({
            startIn: "downloads",
            suggestedName: sqlConnection.getOrgProjDbSchemaUrl().substring("/".length).replaceAll("/", "_") + "_" + nowYYYYMMDD_HHMMSS() + ".sql"
        });

        let progressAbortController = new AbortController();
        let newTask: BackgroundTaskType = {
            id: TASK_ID_PREFIX + generateRandom(),
            label: "Exporting " + sqlConnection.getOrgProjDbSchemaUrl(),
            status: "not_started",
            description: "Exporting " + sqlConnection.getOrgProjDbSchemaUrl(),
            data: { downloaded: 0, progressAbortController: progressAbortController },
            execute: async (task: BackgroundTaskType) => {
                const response = await fetch(url, {
                    method: "GET",
                    headers: {
                        "Authorization": "Basic " + btoa(sqlConnection.getDbUsername() + ":" + sqlConnection.getDbPassword())
                    },
                    signal: progressAbortController.signal
                });
                const writableStream = await fileHandle.createWritable();
                if (!response.body) {
                    return Promise.reject("Unable to get data");
                }
                try {
                    const reader = response.body.getReader();

                    let now = new Date().getTime();
                    let downloaded = 0;
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        await writableStream.write(value);
                        downloaded += value.byteLength;
                        let now2 = new Date().getTime();
                        if (now2 > now + 1000) {
                            now = now2;
                            let t = { ...task };
                            t.data.downloaded = downloaded;
                            updateOrAddTask(tasks, setTasks, t);
                        }
                    }
                    await writableStream.close();
                    let t = { ...task };
                    t.data.downloaded = downloaded;
                    updateOrAddTask(tasks, setTasks, t);
                }
                catch (error) {
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
                return task;
            },
            showMinimal: (task: BackgroundTaskType, tasks: BackgroundTaskType[], setTasks: React.Dispatch<React.SetStateAction<BackgroundTaskType[]>>) => {
                return <div key={task.label} className="NuoRow">
                    <div className="NuoRow">{task.label} {shortenSize(task.data.downloaded)}</div>
                    <div className="NuoRowFixed"><BackgroundTaskStatus task={task} tasks={tasks} setTasks={setTasks} abortController={progressAbortController} /></div>
                </div>;
            },
        };
        setTasks([...tasks, newTask]);
        launchNextBackgroundTask([...tasks, newTask], setTasks);
        setForegroundTaskId(newTask.id);
        return Promise.resolve("");
    }

    return <><form>
        <div className="NuoColumn">
            <div className="NuoHorizontalCheckboxes">
                <label>
                    <input type="checkbox" checked={exportOptions.includeDdl} onChange={() => {
                        setExportOptions({ ...exportOptions, includeDdl: !exportOptions.includeDdl });
                    }} />
                    Include DDL
                </label>
                <label>
                    <input type="checkbox" checked={exportOptions.includeData} onChange={() => {
                        setExportOptions({ ...exportOptions, includeData: !exportOptions.includeData });
                    }} />
                    Include Data
                </label>
                <label>
                    <input type="checkbox" checked={exportOptions.includeDrop} onChange={() => {
                        setExportOptions({ ...exportOptions, includeDrop: !exportOptions.includeDrop });
                    }} />
                    Include Drop Statements
                </label>
                <div className="NuoColumn">
                </div>
            </div>
            <div className="NuoFieldContainer">
                <Select id="table" label="Table to export" value={exportOptions.table || ALL_TABLES} onChange={(event) => {
                    const value = event.target.value === ALL_TABLES ? undefined : event.target.value;
                    setExportOptions({ ...exportOptions, table: value, outputTable: value ? "" : undefined });
                }}>
                    <SelectOption value="___all_tables___">All Tables</SelectOption>
                    {tables.map(table => <SelectOption value={table} key={table}>{table}</SelectOption>)}
                </Select>
            </div>
            {exportOptions.table && <div className="NuoFieldContainer">
                <TextField id="outputTable" label="optionally rename exported Table" value={exportOptions.outputTable || ""} onChange={(event) => {
                    setExportOptions({ ...exportOptions, outputTable: event.currentTarget.value });
                }} />
            </div>}
            <div className="NuoFieldContainer">
                <TextField id="outputSchema" label="optionally rename Schema" value={exportOptions.outputSchema || ""} onChange={(event) => {
                setExportOptions({...exportOptions, outputSchema: event.currentTarget.value});
            }}/>
            </div>
            <div className="NuoFieldContainer">
                <TextField id="batchSize" label="batch size" value={String(exportOptions.batchSize || "500")} onChange={(event) => {
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
            </div>
            <div className="NuoFieldContainer">
                <TextField id="exportLimit" label="export limit per table" value={String(exportOptions.exportLimit || "0")} onChange={(event) => {
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
            </div>

            <div className="NuoRow">
                {(window as any).showOpenFilePicker && <button data-testid="perform.export" onClick={async (event) => {
                    event.preventDefault();
                    await exportFile(sqlConnection, exportOptions);
                }}>Export</button>}
            </div>
        </div>
        {renderForegroundTask()}
    </form>
    </>;
}

export default withTranslation()(SqlExportTab);
