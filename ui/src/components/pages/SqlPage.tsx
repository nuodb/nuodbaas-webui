// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React, { useState } from 'react';
import { useParams } from "react-router"
import { PageProps } from "../../utils/types";
import PageLayout from "./parts/PageLayout";
import { withTranslation } from "react-i18next";
import Button from '../controls/Button';
import TextField from '../controls/TextField';
import Select, { SelectOption } from '../controls/Select';
import SqlSocket, { SqlOperations, SqlResponse, SqlType } from '../../utils/SqlSocket';
import { Table, TableBody, TableCell, TableHead, TableRow } from '../controls/Table';

function SqlPage(props: PageProps) {
    const params = useParams();
    const [operation, setOperation] = useState("EXECUTE_QUERY");
    const [sqlQuery, setSqlQuery] = useState("");
    const [dbUsername, setDbUsername] = useState("");
    const [dbPassword, setDbPassword] = useState("");
    const [dbSchema, setDbSchema] = useState("");
    const [sqlSocket, setSqlSocket] = useState<SqlType | undefined | void | "">(undefined);
    const [results, setResults] = useState<SqlResponse | undefined>(undefined);

    async function onSubmitSql() {
        if (sqlSocket) {
            setResults(await sqlSocket.executeQuery(sqlQuery));
        }
    }

    function renderLogin() {
        return <>
            <TextField id="dbUsername" label="DB Username" value={dbUsername} onChange={(event) => setDbUsername(event.currentTarget.value)} />
            <TextField id="dbPassword" label="DB Password" value={dbPassword} onChange={(event) => setDbPassword(event.currentTarget.value)} />
            <TextField id="dbSchema" label="DB Schema" value={dbSchema} onChange={(event) => setDbSchema(event.currentTarget.value)} />
            <Button disabled={!params.organization || !params.project || !params.database || !dbUsername || !dbPassword || !dbSchema} onClick={async () => {
                if (params.organization && params.project && params.database && dbSchema) {
                    const s = SqlSocket(params.organization, params.project, params.database, dbSchema, dbUsername, dbPassword);
                    const results: SqlResponse = await s.executeQuery("SELECT 1 FROM DUAL");
                    if (results.error) {
                        setResults(results);
                    }
                    else {
                        setSqlSocket(s);
                    }
                }
            }}>Login</Button>
        </>;
    }

    function renderResults(results: SqlResponse) {
        if (results.error) {
            return <div className="NuoSqlError">{results.error.split("\n").map(line => <div>{line}</div>)}</div>
        }
        return <Table>
            <TableHead>
                <tr>
                    {results.columns?.map((column, index) => <th key={index}>{column.name}</th>)}
                </tr>
            </TableHead>
            <TableBody>
                {results.rows?.map((row, index) => <TableRow key={index}>
                    {row.values.map((col, cindex) => <TableCell key={cindex}>{col}</TableCell>)}
                </TableRow>)}
            </TableBody>
        </Table>
    }

    function renderQuery() {
        return <form>
            <div className="NuoRow">
                <div className="NuoRowFixed">
                    <Select id="operation" label={props.t("field.operation.label")} value={operation} autoFocus={true} onChange={({ target: input }) => {
                        setOperation(input.value);
                    }} disabled={false}>
                        {SqlOperations.map((operation: string) => <SelectOption key={operation} value={operation}>{operation}</SelectOption>)}
                    </Select></div>
                <TextField required data-testid="sqlQuery" id="sqlQuery" label="SQL Query" value={sqlQuery} onChange={(event) => setSqlQuery(event.target.value)} />
                <Button data-testid="submitSql" disabled={!sqlSocket} variant="contained" type="submit" onClick={onSubmitSql}>Submit</Button>
            </div>
        </form>;
    }

    return <PageLayout {...props}>
        <h1>{params.organization} / {params.project} / {params.database}</h1>
        {sqlSocket ? renderQuery() : renderLogin()}
        {results && renderResults(results)}
    </PageLayout>;
}

export default withTranslation()(SqlPage);
