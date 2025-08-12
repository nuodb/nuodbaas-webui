// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React, { useEffect, useState } from 'react';
import { withTranslation } from "react-i18next";
import { t } from 'i18next';
import { SqlImportResponseType, SqlResponse, SqlType } from '../../../utils/SqlSocket';
import TextField from '../../controls/TextField';
import Button from '../../controls/Button';
import SqlResultsRender from './SqlResultsRender';
import Toast from '../../controls/Toast';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import axios from 'axios';
import { Table, TableBody, TableCell, TableHead, TableRow, TableTh } from '../../controls/Table';

type SqlImportTabProps = {
    sqlConnection: SqlType;
    dbTable: string;
}
function SqlImportTab({ sqlConnection, dbTable }: SqlImportTabProps) {
    const [executing, setExecuting] = useState(false);
    const [files, setFiles] = useState<File[]>([]); // files to be uploaded
    const [sqlImportResponse, setSqlImportResponse] = useState<(SqlImportResponseType|undefined)[]>([]); // upload status. If element is undefined, upload hasn't started yet
    const [completed, setCompleted] = useState<boolean[]>([]); //status of completion

    function renderFileSelector() {
        if(files.length !== 0) {
            return null;
        }

        return <>
            <input className="NuoUpload"
                id="file-upload"
                type="file"
                accept="text/sql"
                multiple={true}
                onChange={(event) => {
                    const fl: FileList | null = event.target.files;
                    let files: File[] = [];
                    for(let i=0; fl !== null && i<fl.length; i++) {
                        const flItem = fl.item(i);
                        if(flItem) {
                            files.push(flItem);
                        }
                    }
                    setCompleted(files.map(file=>false));
                    setSqlImportResponse(files.map(file=>undefined))
                    setFiles(files);
                }}
            />
            <label htmlFor="file-upload" className="NuoUpload">
                <div className="NuoColumn">
                    <CloudUploadIcon/>
                    Select Files
                </div>
            </label>
        </>
    }

    function renderFileStatus() {
        if(files.length === 0) {
            return null;
        }
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
                {files.map((file,index)=> {
                    let stats = sqlImportResponse[index] || {};
                    return <TableRow key={file.name}>
                        <TableCell>{file.name}</TableCell>
                        <TableCell>{sqlImportResponse[index] === undefined ? "Not Started" : completed[index] ? "Done" : "In Progress"}</TableCell>
                        <TableCell>{stats.success}</TableCell>
                        <TableCell>{stats.failed}</TableCell>
                        <TableCell>{stats.updatedRows}</TableCell>
                    </TableRow>})}
            </TableBody>
        </Table>;
    }

    function renderUploadButton() {
        if(files.length === 0 || sqlImportResponse.findIndex(i => i !== undefined) !== -1) {
            return null;
        }

        return <Button onClick={async () => {
            for(let i=0; i<files.length; i++) {
                setSqlImportResponse((response) => {
                    let r = [...response];
                    r[i] = {};
                    return r;
                });
                const importResults = await sqlConnection.sqlImport(files[i]);
                setSqlImportResponse((response) => {
                    let r = [...response];
                    r[i] = importResults;
                    return r;
                });
                setCompleted((completed)=>{
                    let c = [...completed];
                    c[i] = true;
                    return c;
                })
            }
        }}>
            Upload {files.length} files
        </Button>

    }

    return <><form>
        <div className="NuoColumn NuoFieldContainer NuoCenter">
            {renderFileSelector()}
            {renderFileStatus()}
            {renderUploadButton()}
        </div>
    </form>
    </>;
}

export default withTranslation()(SqlImportTab);
