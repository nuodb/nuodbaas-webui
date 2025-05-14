export enum SqlWebsocketOperations {
    EXECUTE, EXECUTE_QUERY, EXECUTE_BATCH, EXECUTE_UPDATE, PREPARED_EXECUTE, PREPARED_EXECUTE_QUERY, PREPARED_EXECUTE_UPDATE, SET_SAVEPOINT,ROLLBACK,RELEASE_SAVEPOINT,COMMIT,
};

export type SqlRequest = {
    requestId?: string;
    operation: SqlWebsocketOperations;
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

export type SqlWebsocketType = {
    executeQuery: (sql: string) => Promise<SqlResponse>;
}

export default function SqlWebsocket(organization: string, project: string, database: string, schema: string) : SqlWebsocketType {
    let ws: WebSocket|undefined = undefined;
    const message = new Map<number, (message: SqlResponse)=>void>();
    let nextTransactionId = 0;

    return { executeQuery };

    async function open() : Promise<void> {
        if(ws && ws.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            ws = new WebSocket("/api/ws/sql/" + encodeURIComponent(organization) + "/" + encodeURIComponent(project) + "/" + encodeURIComponent(database) + "/" + encodeURIComponent(schema));
            message.clear();
            ws.onopen = ()=>{
                resolve();
            };
            ws.onerror = (event: Event): any =>{
                reject(event);
            }
            ws.onmessage = ()=>{
                console.log("onmessage");
            }
        });
    }

    function close() {
        if(ws) {
            ws.close();
        }
    }

    async function executeQuery(sql: string): Promise<SqlResponse> {
        return anyCommand(SqlWebsocketOperations.EXECUTE_QUERY, [sql]);
    }

    async function anyCommand(operation: SqlWebsocketOperations, args: any[]) : Promise<SqlResponse> {
        await open();
        return new Promise((resolve, reject)=> {
            let request : SqlRequest = {operation, args, requestId: String(nextTransactionId)};
            message.set(nextTransactionId, (response: SqlResponse)=> {
                resolve(response);
            });
            nextTransactionId++;
            console.log("STEP1", JSON.stringify(request));
            ws?.send(JSON.stringify(request));
        });
    }
}
