// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import axios, { AxiosProgressEvent } from "axios";

export type SqlOperationType =
    "SET_CREDENTIALS"|
    "EXECUTE"|
    "EXECUTE_QUERY"|
    "EXECUTE_BATCH"|
    "EXECUTE_UPDATE"|
    "PREPARED_EXECUTE"|
    "PREPARED_EXECUTE_QUERY"|
    "PREPARED_EXECUTE_UPDATE"
;

export const SqlOperations: string[] = [
    "EXECUTE",
    "EXECUTE_QUERY",
    "EXECUTE_UPDATE"];

export type SqlRequest = {
    requestId?: string;
    operation: string;
    args?: any[];
};

export type ColumnMetaData = {
    name: string;
    label?: string;
    type: string;
}

export type Row = {
    values: any[];
}

export type SqlResponse = {
    requestId: string;
    status: "SUCCESS"|"FAILURE";
    error?: string;
    columns?: ColumnMetaData[];
    rows?: Row[];
};

export type SqlImportResponseType = {
    success?: number;
    failed?: number;
    updatedRows?: number;
    failedQueries?: string[];
    error?: string;
}

export type SqlExportParams = {
    includeDdl: boolean;
    includeData: boolean;
    includeDrop: boolean;
}


export type SqlType = {
    runCommand: (operation: SqlOperationType, args: any[]) => Promise<SqlResponse>;
    getDefaultSchema: () => string;
    sqlImport: (file: File, progressKey: string) => Promise<SqlImportResponseType>;
    getDbUsername: () => string;
    getDbPassword: () => string;
}

export default function SqlSocket(organization: string, project: string, database: string, schema: string, dbUsername: string, dbPassword: string) : SqlType {
    let nextTransactionId = 0;

    async function runCommand(operation: SqlOperationType, args: any[]) : Promise<SqlResponse> {
        let request : SqlRequest = {operation: operation.toString(), args, requestId: String(nextTransactionId)};
        nextTransactionId++;
        const response = await axios.post(
            "/api/sql/query" + getOrgProjDbSchemaUrl(),
            request,
            { headers:{
                "Authorization": "Basic " + btoa(dbUsername + ":" + dbPassword)
            }});
        return response.data;
    }

    function getDefaultSchema() {
        return schema;
    }

    function getOrgProjDbSchemaUrl() {
        return "/" + encodeURIComponent(organization) + "/" + encodeURIComponent(project) + "/" + encodeURIComponent(database) + "/" + encodeURIComponent(schema);
    }

    function getDbUsername() {
        return dbUsername;
    }

    function getDbPassword() {
        return dbPassword;
    }

    async function sqlImport(file: File, progressKey: string) : Promise<SqlImportResponseType> {
        try {
            const response = await axios.post('/api/sql/import/sql/' + getOrgProjDbSchemaUrl() + "?progressKey=" + progressKey, file, {
                headers: {
                    "Authorization": "Basic " + btoa(dbUsername + ":" + dbPassword),
                    'Content-Type': file.type
                }
            });
            return response.data;
        }
        catch(error) {
                console.error('Error uploading file:', error);
                return { error: "Error uploading file: " + error}
        }
    }

    return { runCommand, getDefaultSchema, sqlImport, getDbUsername, getDbPassword };
}
