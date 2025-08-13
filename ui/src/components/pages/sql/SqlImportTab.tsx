// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React, { useEffect, useState } from 'react';
import { withTranslation } from "react-i18next";
import { t } from 'i18next';
import { SqlImportResponseType, SqlResponse, SqlType } from '../../../utils/SqlSocket';
import Button from '../../controls/Button';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { Table, TableBody, TableCell, TableHead, TableRow, TableTh } from '../../controls/Table';
import BackgroundTasks, { BackgroundTaskType } from '../../../utils/BackgroundTasks';

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
            return {
                listenerId: "sqlImport",
                label: file.name,
                status: "not_started",
                description: "Importing " + file.name,
                data: { file: file },
                execute: async (data: SqlImportData) => {
                    return { ...data, ... await sqlConnection.sqlImport(data.file) };
                },
                show: (data: SqlImportData) => {
                    return <div key={data.file.name}>{data.file.name}</div>
                }
            }
        }));

        let newFiles = [...files];
        for (let i = 0; i < toQueue.length; i++) {
            newFiles = newFiles.filter(f => f.name !== toQueue[i].name || f.lastModified != toQueue[i].lastModified || f.size != toQueue[i].size);
        }

        setFiles(newFiles);
    }

    function renderFileStatus() {
        return <Table>
            <TableHead>
                <TableRow>
                    <TableTh>Filename</TableTh>
                    <TableTh>Status</TableTh>
                    <TableTh>Success</TableTh>
                    <TableTh>Failures</TableTh>
                    <TableTh>Updates</TableTh>
                    <TableTh>Error</TableTh>
                </TableRow>
            </TableHead>
            <TableBody>
                {files.map((file, index) => {
                    return <TableRow key={file.name}>
                        <TableCell>{file.name}</TableCell>
                        <td><Button onClick={() => { addToQueue([file]); }}>Add to Queue</Button></td>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                })}
                {files.length === 0 ? null : <TableRow><TableCell></TableCell><td><Button className="NuoButton" onClick={() => { addToQueue(files); }}>Add all to Queue</Button></td></TableRow>}
                {tasks.map((task) => {
                    return <TableRow key={task.data.file.name}>
                        <TableCell>{task.data.file.name}</TableCell>
                        <TableCell>{task.status}</TableCell>
                        <TableCell>{task.data.success}</TableCell>
                        <TableCell>{task.data.failed}</TableCell>
                        <TableCell>{task.data.updatedRows}</TableCell>
                    </TableRow>})}
            </TableBody>
        </Table>;
    }

    return <><form>
        <div className="NuoColumn NuoFieldContainer NuoCenter">
            <div className="NuoRow">
                {renderFileSelector()}
                {renderFileStatus()}
            </div>
        </div>
    </form>
    </>;
}

export default withTranslation()(SqlImportTab);
