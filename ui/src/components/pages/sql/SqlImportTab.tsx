// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React, { useState } from 'react';
import { withTranslation } from "react-i18next";
import { t } from 'i18next';
import { SqlImportResponseType, SqlType } from '../../../utils/SqlSocket';
import Button from '../../controls/Button';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { Table, TableBody, TableCell, TableHead, TableRow, TableTh } from '../../controls/Table';
import { BackgroundTaskType, generateRandom, launchNextBackgroundTask, shortenSize, updateOrAddTask } from '../../../utils/BackgroundTasks';
import { Rest } from '../parts/Rest';
import { concatChunks } from '../../../utils/schema';
import { TempAny } from '../../../utils/types';
import Toast from '../../controls/Toast';
import BackgroundTaskStatus from '../../../utils/BackgroundTaskStatus';

type SqlImportTabProps = {
    tasks: BackgroundTaskType[];
    setTasks: React.Dispatch<React.SetStateAction<BackgroundTaskType[]>>;
    sqlConnection: SqlType;
    dbTable: string;
}

interface SqlImportData extends SqlImportResponseType {
    file: File;
}

let progressAbortController = new AbortController();
const TASK_ID_PREFIX = "sqlimport_";

function SqlImportTab({ sqlConnection, dbTable, tasks, setTasks }: SqlImportTabProps) {
    const [files, setFiles] = useState<File[]>([]); // files to be uploaded

    function renderFileSelector() {
        return <div className="NuoColumn NuoCenter">
            <input className="NuoUpload"
                id="file-upload"
                type="file"
                accept=".sql"
                multiple={true}
                onChange={(event) => {
                    let updatedFiles: File[] = [...files];
                    const fl: FileList | null = event.target.files;
                    for(let i=0; fl !== null && i<fl.length; i++) {
                        const flItem = fl.item(i);
                        if(flItem) {
                            // add file only if it hasn't been added before
                            if (!updatedFiles.find(f => f.name === flItem.name && f.size === flItem.size && f.lastModified === flItem.lastModified)) {
                                updatedFiles.push(flItem);
                            }
                        }
                    }
                    setFiles(updatedFiles);
                    event.target.value = "";
                }}
            />
            <label htmlFor="file-upload" className="NuoUpload">
                <div className="NuoColumn">
                    <CloudUploadIcon/>
                    Select SQL Files
                </div>
            </label>
        </div>
    }

    async function setProgress(task: BackgroundTaskType): Promise<string> {
        return new Promise((resolve, reject) => {
            let headers = { Authorization: "Basic " + btoa(sqlConnection.getDbUsername() + ":" + sqlConnection.getDbPassword()) }
            Rest.getStream("/api/sql/progress/sqlimport", headers, progressAbortController)
                .then(async (response: TempAny) => {
                    let buffer = Uint8Array.of();
                    let gotProgressKey = false;
                    for await (let chunk of response) {
                        buffer = concatChunks(buffer, chunk);
                        while (buffer.length > 0) {
                            let posNewline = buffer.indexOf("\n".charCodeAt(0));
                            if (posNewline === -1) {
                                break;
                            }
                            let line = new TextDecoder().decode(buffer.slice(0, posNewline));
                            buffer = buffer.slice(posNewline + 1);
                            const stats: SqlImportData = JSON.parse(line);
                            if (stats.progressKey && !gotProgressKey) {
                                gotProgressKey = true;
                                resolve(stats.progressKey);
                            }
                            else {
                                if (task) {
                                    task = { ...task };
                                    task.data = { ...task.data, ...stats };
                                    if (task.data && task.data.file && stats.bytesProcessed) {
                                        task.percent = stats.bytesProcessed * 100 / task.data.file.size;
                                    }
                                    updateOrAddTask(tasks, setTasks, task);
                                }
                            }
                        }
                    }
                })
                .catch((error) => {
                    if (error.status) {
                        Toast.show("Cannot get progress monitoring", error.status + " " + error.message);
                    }
                    else {
                        //request was aborted. Ignore.
                    }
                })
        });
    }

    function clearProgress() {
        progressAbortController?.abort();
        progressAbortController = new AbortController();
    }

    async function addToQueue(toQueue: File[]) {
        let newTasks: BackgroundTaskType[] = (toQueue.map(file => {
            return {
                id: TASK_ID_PREFIX + generateRandom(),
                listenerId: "sqlImport",
                label: file.name,
                status: "not_started",
                description: "Importing " + file.name,
                data: { file: file },
                execute: async (task: BackgroundTaskType) => {
                    const progressKey = await setProgress(task);
                    const stats = await sqlConnection.sqlImport(task.data.file, progressKey, progressAbortController);
                    clearProgress();
                    task = { ...task };
                    task.data = { ...task.data, ...stats };
                    if (stats.error === "Canceled") {
                        task.status = "canceled";
                    }
                    else if (stats.error || stats.failed) {
                        task.status = "error";
                    }
                    return task;
                },
                showMinimal: (task: BackgroundTaskType, tasks: BackgroundTaskType[], setTasks: React.Dispatch<React.SetStateAction<BackgroundTaskType[]>>) => {
                    return <div key={task.data.file.name} className="NuoRow">
                        <div className="NuoRow">{task.data.file.name}</div>
                        <div className="NuoRowFixed"><BackgroundTaskStatus task={task} tasks={tasks} setTasks={setTasks} abortController={progressAbortController} /></div>
                    </div>;
                },
            };
        }));

        setTasks(newTasks);
        launchNextBackgroundTask(newTasks, setTasks);

        let newFiles = [...files];
        for (let i = 0; i < toQueue.length; i++) {
            newFiles = newFiles.filter(f => f.name !== toQueue[i].name || f.lastModified != toQueue[i].lastModified || f.size != toQueue[i].size);
        }

        setFiles(newFiles);
    }

    function renderFileStatus(files: File[], tasks: BackgroundTaskType[]) {
        return <Table>
            <TableHead>
                <TableRow>
                    <TableTh>Filename</TableTh>
                    <TableTh></TableTh>
                    <TableTh>Success</TableTh>
                    <TableTh>Failures</TableTh>
                    <TableTh>Updates</TableTh>
                    <TableTh>Error</TableTh>
                    <TableTh>Status</TableTh>
                </TableRow>
            </TableHead>
            <TableBody>
                {files.map((file, index) => {
                    return <TableRow key={file.name}>
                        <TableCell>{file.name}</TableCell>
                        <TableCell className="NuoColumn">
                            <div className="NuoUploadLightLabel">{shortenSize(file.size)}</div>
                            <div className="NuoUploadLightLabel">{(new Date(file.lastModified)).toLocaleDateString()}</div>
                        </TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <td><Button onClick={() => { addToQueue([file]); }}>Add to Queue</Button></td>
                    </TableRow>
                })}
                {files.length === 0 ? null : <TableRow>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <td><Button className="NuoButton" onClick={() => { addToQueue(files); }}>Add all to Queue</Button></td>
                </TableRow>}
                {tasks.filter(t => t.id.startsWith(TASK_ID_PREFIX)).map((task) => {
                    return <TableRow key={task.data.file.name}>
                        <TableCell>{task.data.file.name}</TableCell>
                        <TableCell className="NuoColumn">
                            <div className="NuoUploadLightLabel">{shortenSize(task.data.file.size)}</div>
                            <div className="NuoUploadLightLabel">{(new Date(task.data.file.lastModified)).toLocaleDateString()}</div>
                        </TableCell>
                        <TableCell>{task.data.success}</TableCell>
                        <TableCell>{task.data.failed}</TableCell>
                        <TableCell>{task.data.updatedRows}</TableCell>
                        <TableCell>{task.data.error || task.data.failedQueries && task.data.failedQueries.length &&
                            <details>
                                <summary>Failed Queries:</summary>
                                {task.data.failedQueries.map((fq: string, index: number) => <div key={index}>{fq}</div>)}
                            </details> || null}
                        </TableCell>
                        <TableCell><BackgroundTaskStatus task={task} tasks={tasks} setTasks={setTasks} abortController={progressAbortController} /></TableCell>
                    </TableRow>})}
            </TableBody>
        </Table>;
    }

    return <><form>
        <div className="NuoColumn NuoFieldContainer NuoCenter">
            <div className="NuoRow">
                {renderFileSelector()}
                {renderFileStatus(files, tasks)}
            </div>
        </div>
    </form>
    </>;
}

export default withTranslation()(SqlImportTab);
