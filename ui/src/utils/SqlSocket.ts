import axios from "axios";

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

export type SqlType = {
    execute: (sql: string) => Promise<SqlResponse>;
    executeQuery: (sql: string) => Promise<SqlResponse>;
}

export default function SqlSocket(organization: string, project: string, database: string, schema: string, dbUsername: string, dbPassword: string) : SqlType {
    let nextTransactionId = 0;

    return { execute, executeQuery };

    async function execute(sql: string): Promise<SqlResponse> {
        return await anyCommand("EXECUTE_QUERY", [sql]);
    }

    async function executeQuery(sql: string): Promise<SqlResponse> {
        return await anyCommand("EXECUTE_QUERY", [sql]);
    }

    async function setCredentials(dbUsername: string, dbPassword: string): Promise<SqlResponse> {
        return await anyCommand("SET_CREDENTIALS", [dbUsername, dbPassword]);
    }

    async function anyCommand(operation: SqlOperationType, args: any[]) : Promise<SqlResponse> {
        let request : SqlRequest = {operation: operation.toString(), args, requestId: String(nextTransactionId)};
        nextTransactionId++;
        const response = await axios.post(
            "/api/sql/" + encodeURIComponent(organization) + "/" + encodeURIComponent(project) + "/" + encodeURIComponent(database) + "/" + encodeURIComponent(schema),
            request,
            { headers:{
                "Authorization": "Basic " + btoa(dbUsername + ":" + dbPassword)
            }});
        return response.data;
    }
}
