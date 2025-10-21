// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React, { useEffect, useState } from 'react';
import { withTranslation } from "react-i18next";
import { t } from 'i18next';
import TextField from '../../controls/TextField';
import { BackgroundTaskType, generateRandom, isTaskFinished, launchNextBackgroundTask, shortenSize, updateOrAddTask } from '../../../utils/BackgroundTasks';
import BackgroundTaskStatus, { BackgroundTaskStatusIcon } from '../../../utils/BackgroundTaskStatus';
import Toast from '../../controls/Toast';
import DialogMaterial from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '../../controls/Button';
import { SqlType } from '../../../utils/SqlSocket';
import { Checkbox } from '../../controls/Checkboxes';

type SqlExportTabProps = {
    tasks: BackgroundTaskType[];
    setTasks: React.Dispatch<React.SetStateAction<BackgroundTaskType[]>>;
    sqlConnection: SqlType;
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

function SqlExportTab({ tasks, setTasks, sqlConnection }: SqlExportTabProps) {
    const [includeDdl, setIncludeDdl] = useState<boolean>(true);
    const [includeData, setIncludeData] = useState<boolean>(true);
    const [includeDrop, setIncludeDrop] = useState<boolean>(false);
    const [exportTables, setExportTables] = useState<string[] | undefined>(undefined);
    const [outputTables, setOutputTables] = useState<{ [table: string]: string }>({});
    const [outputSchema, setOutputSchema] = useState<string>("");
    const [batchSize, setBatchSize] = useState<string | undefined>("500");
    const [exportLimit, setExportLimit] = useState<string | undefined>("0");
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
                    {isTaskFinished(task) && t("button.dismiss") || t("button.cancel")}
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

    async function exportFile(sqlConnection: SqlType): Promise<string> {
        const showSaveFilePicker = localStorage.getItem("selenium") === "true" ? fakeShowSaveFilePicker : (window as any).showSaveFilePicker;
        if (!showSaveFilePicker) {
            return Promise.reject("Streamed download not supported");
        }
        const fileHandle: FileSystemFileHandle = await showSaveFilePicker({
            startIn: "downloads",
            suggestedName: sqlConnection.getOrgProjDbSchemaUrl().substring("/".length).replaceAll("/", "_") + "_" + nowYYYYMMDD_HHMMSS() + ".sql"
        });

        const url = new URL(location.protocol + location.host + "/api/sql/export/sql" + sqlConnection.getOrgProjDbSchemaUrl());
        const body = {
            includeDdl,
            includeData,
            includeDrop,
            table: exportTables || undefined,
            outputTable: exportTables && exportTables.map(et => outputTables[et] || et) || undefined,
            batchSize: batchSize ? Number(batchSize) : undefined,
            exportLimit: exportLimit ? Number(exportLimit) : undefined,
            outputSchema: outputSchema || undefined,
        };

        let progressAbortController = new AbortController();
        let newTask: BackgroundTaskType = {
            id: TASK_ID_PREFIX + generateRandom(),
            label: t("form.sqleditor.label.exporting", { dbSchema: sqlConnection.getOrgProjDbSchemaUrl() }),
            status: "not_started",
            description: t("form.sqleditor.label.exporting", { dbSchema: sqlConnection.getOrgProjDbSchemaUrl() }),
            data: { downloaded: 0, progressAbortController: progressAbortController },
            execute: async (task: BackgroundTaskType) => {
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Authorization": "Basic " + btoa(sqlConnection.getDbUsername() + ":" + sqlConnection.getDbPassword()),
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
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
                    <input type="checkbox" checked={includeDdl} onChange={() => {
                        setIncludeDdl(!includeDdl);
                    }} />
                    {t("form.sqleditor.label.includeDdl")}
                </label>
                <label>
                    <input type="checkbox" checked={includeData} onChange={() => {
                        setIncludeData(!includeData);
                    }} />
                    {t("form.sqleditor.label.includeData")}
                </label>
                <label>
                    <input type="checkbox" checked={includeDrop} onChange={() => {
                        setIncludeDrop(!includeDrop);
                    }} />
                    {t("form.sqleditor.label.includeDrop")}
                </label>
                <div className="NuoColumn">
                </div>
            </div>
            <div className="NuoFieldContainer">
                <Checkbox
                    id="___all_tables___"
                    label={t("form.sqleditor.label.allTables")}
                    checked={!exportTables || exportTables.length === tables.length}
                    onChange={event => {
                        if (event.currentTarget.checked) {
                            setExportTables(undefined);
                        }
                        else {
                            setExportTables([]);
                        }
                    }}
                />
                <div className="NuoRow">
                    <div className="NuoColumnFixed">
                        {tables.map((table, index) => (
                            <Checkbox
                                id={table}
                                checked={exportTables === undefined || exportTables.includes(table)}
                                label={table}
                                onChange={(event) => {
                                    let newTables = exportTables === undefined ? [...tables] : [...exportTables];
                                    if (newTables.includes(table)) {
                                        newTables = newTables.filter(t => t !== table);
                                        let newOutputTables = { ...outputTables };
                                        delete newOutputTables[table];
                                        setOutputTables(newOutputTables);
                                    }
                                    else {
                                        newTables.push(table);
                                    }
                                    setExportTables(newTables);
                                }}
                            />
                        ))}
                    </div>
                    <div className="NuoColumn">
                        {tables.map((table, index) => <div className="NuoFieldContainer">
                            <TextField
                                id={"outputTable_" + table}
                                label={t("form.sqleditor.label.renameTable")}
                                value={outputTables[table] || ""}
                                disabled={exportTables !== undefined && !exportTables.includes(table)}
                                size="small"
                                onChange={(event) => {
                                    setOutputTables({ ...outputTables, [table]: event.currentTarget.value });
                                }}
                            />
                        </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="NuoFieldContainer">
                <TextField id="outputSchema" label={t("form.sqleditor.label.renameSchema")} value={outputSchema || ""} onChange={(event) => {
                    setOutputSchema(event.currentTarget.value);
            }}/>
            </div>
            <div className="NuoFieldContainer">
                <TextField id="batchSize" label={t("form.sqleditor.label.batchSize")} value={String(batchSize || "")} onChange={(event) => {
                if(event.currentTarget.value === "") {
                    setBatchSize(undefined);
                }
                else {
                    const num = Number(event.currentTarget.value);
                    if(!isNaN(num)) {
                        setBatchSize(event.currentTarget.value);
                    }
                }
            }}/>
            </div>
            <div className="NuoFieldContainer">
                <TextField id="exportLimit" label={t("form.sqleditor.label.exportLimit")} value={String(exportLimit || "")} onChange={(event) => {
                if(event.currentTarget.value === "") {
                    setExportLimit(undefined);
                }
                else {
                    const num = Number(event.currentTarget.value);
                    if(!isNaN(num)) {
                        setExportLimit(event.currentTarget.value);
                    }
                }
            }}/>
            </div>

            <div className="NuoRow">
                {(window as any).showOpenFilePicker && <button data-testid="perform.export" onClick={async (event) => {
                    event.preventDefault();
                    await exportFile(sqlConnection);
                }}>{t("button.sql.export")}</button>}
            </div>
        </div>
        {renderForegroundTask()}
    </form>
    </>;
}

export default withTranslation()(SqlExportTab);
