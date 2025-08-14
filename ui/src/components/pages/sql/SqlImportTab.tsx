// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React, { useEffect, useState } from 'react';
import { withTranslation } from "react-i18next";
import { t } from 'i18next';
import { SqlImportResponseType, SqlResponse, SqlType } from '../../../utils/SqlSocket';
import Button from '../../controls/Button';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { Table, TableBody, TableCell, TableHead, TableRow, TableTh } from '../../controls/Table';
import BackgroundTasks, { BackgroundTaskType } from '../../../utils/BackgroundTasks';
import axios from 'axios';

type SqlImportTabProps = {
    sqlConnection: SqlType;
    dbTable: string;
}

interface SqlImportData extends SqlImportResponseType {
    file: File;
}

function SqlImportTab({ sqlConnection, dbTable }: SqlImportTabProps) {
    const [files, setFiles] = useState<File[]>([]); // files to be uploaded
    const [tasks, setTasks] = useState<BackgroundTaskType[]>(BackgroundTasks.getTasks().filter(task => task.listenerId === "sqlImport"));

    let listenerId = -1;

    useEffect(() => {
        listenerId = BackgroundTasks.addListener((tasks: BackgroundTaskType[]) => {
            setTasks(tasks.filter(task => task.listenerId === "sqlImport"));
        });
        return () => {
            BackgroundTasks.removeListener(listenerId);
        };
    }, [])

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

    function addToQueue(toQueue: File[]) {
        BackgroundTasks.addTasks(toQueue.map(file => {
            const progressKey = crypto.randomUUID();
            return {
                listenerId: "sqlImport",
                label: file.name,
                status: "not_started",
                description: "Importing " + file.name,
                data: { file: file, progressKey },
                execute: async (data: SqlImportData) => {
                    return {
                        ...data, ... await sqlConnection.sqlImport(data.file, progressKey)
                    };
                },
                progressUpdate: async (data: SqlImportData) => {
                    return new Promise((resolve, reject) => {
                        axios.get("/api/sql/progress/sqlimport?progressKey=" + progressKey, {
                            headers: {
                                "Authorization": "Basic " + btoa(sqlConnection.getDbUsername() + ":" + sqlConnection.getDbPassword()),
                            }
                        }).then(response => {
                            resolve({ ...data, ...response.data });
                        })
                    });
                },
                showMinimal: (task: BackgroundTaskType) => {
                    return <div key={task.data.file.name} className="NuoRow"><div>{task.data.file.name}</div><div>{BackgroundTasks.renderStatus(task)}</div></div>
                },
                show: (task: BackgroundTaskType) => {
                    return <></>;
                }
            }
        }));

        let newFiles = [...files];
        for (let i = 0; i < toQueue.length; i++) {
            newFiles = newFiles.filter(f => f.name !== toQueue[i].name || f.lastModified != toQueue[i].lastModified || f.size != toQueue[i].size);
        }

        setFiles(newFiles);
    }

    function shortenSize(size: number): string {
        let suffix = " B";
        if (size > 1024 * 1024 * 1024) {
            size = size / 1024 / 1024 / 1024;
            suffix = " GB";
        }
        else if (size > 1024 * 1024) {
            size = size / 1024 / 1024;
            suffix = " MB";
        }
        else if (size > 1024) {
            size = size / 1024;
            suffix = " KB";
        }
        if (size >= 100) {
            size = Math.round(size);
        }
        else if (size >= 10) {
            size = Math.round(size * 10) / 10;
        }
        else {
            size = Math.round(size * 100) / 100;
        }
        return String(size) + suffix;
    }

    function renderFileStatus(files: File[], tasks: BackgroundTaskType[]) {
        return <Table>
            <TableHead>
                <TableRow>
                    <TableTh>Filename</TableTh>
                    <TableTh></TableTh>
                    <TableTh>Status</TableTh>
                    <TableTh>Success</TableTh>
                    <TableTh>Failures</TableTh>
                    <TableTh>Updates</TableTh>
                    <TableTh>Error</TableTh>
                    <TableTh></TableTh>
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
                    <TableCell></TableCell>
                    <td><Button className="NuoButton" onClick={() => { addToQueue(files); }}>Add all to Queue</Button></td>
                </TableRow>}
                {tasks.map((task) => {
                    return <TableRow key={task.data.file.name}>
                        <TableCell>{task.data.file.name}</TableCell>
                        <TableCell className="NuoColumn">
                            <div className="NuoUploadLightLabel">{shortenSize(task.data.file.size)}</div>
                            <div className="NuoUploadLightLabel">{(new Date(task.data.file.lastModified)).toLocaleDateString()}</div>
                        </TableCell>
                        <TableCell>{BackgroundTasks.renderStatus(task)}</TableCell>
                        <TableCell>{task.data.success}</TableCell>
                        <TableCell>{task.data.failed}</TableCell>
                        <TableCell>{task.data.updatedRows}</TableCell>
                        <TableCell>{task.data.error || task.data.failedQueries && task.data.failedQueries.length &&
                            <details>
                                <summary>Failed Queries:</summary>
                                {task.data.failedQueries.map((fq: string) => <div>{fq}</div>)}
                            </details> || null}
                        </TableCell>
                        <TableCell>

                        </TableCell>
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
