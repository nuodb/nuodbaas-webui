// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React, { useState } from 'react';
import { useParams } from "react-router"
import { PageProps } from "../../utils/types";
import PageLayout from "./parts/PageLayout";
import { withTranslation } from "react-i18next";
import Button from '../controls/Button';
import TextField from '../controls/TextField';
import Select, { SelectOption } from '../controls/Select';
import SqlSocket, { SqlOperations, SqlOperationType, SqlResponse, SqlType } from '../../utils/SqlSocket';
import { Table, TableBody, TableCell, TableHead, TableRow, TableTh } from '../controls/Table';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import { styled } from '@mui/material';
import { t } from 'i18next';

function SqlPage(props: PageProps) {
    const params = useParams();
    const [operation, setOperation] = useState<SqlOperationType>("EXECUTE_QUERY");
    const [sqlQuery, setSqlQuery] = useState("");
    const [dbUsername, setDbUsername] = useState("");
    const [dbPassword, setDbPassword] = useState("");
    const [dbSchema, setDbSchema] = useState("");
    const [sqlSocket, setSqlSocket] = useState<SqlType | undefined | void | "">(undefined);
    const [results, setResults] = useState<SqlResponse | undefined>(undefined);

    const StyledBreadcrumbs = styled(Breadcrumbs)({
        '.MuiBreadcrumbs-ol': {
            flexWrap: 'nowrap'
        }
    });

    async function onSubmitSql() {
        if (sqlSocket) {
            setResults(await sqlSocket.runCommand(operation, [sqlQuery]));
        }
    }

    function renderLogin() {
        return <>
            <div className="NuoFieldContainer">
                <TextField id="dbUsername" label={t("form.sqleditor.dbUsername")} value={dbUsername} onChange={(event) => setDbUsername(event.currentTarget.value)} />
            </div>
            <div className="NuoFieldContainer">
                <TextField id="dbPassword" label={t("form.sqleditor.dbPassword")} value={dbPassword} onChange={(event) => setDbPassword(event.currentTarget.value)} />
            </div>
            <div className="NuoFieldContainer">
                <TextField id="dbSchema" label={t("form.sqleditor.dbSchema")} value={dbSchema} onChange={(event) => setDbSchema(event.currentTarget.value)} />
            </div>
            <div className="NuoFieldContainer">
            <Button disabled={!params.organization || !params.project || !params.database || !dbUsername || !dbPassword || !dbSchema} onClick={async () => {
                if (params.organization && params.project && params.database && dbSchema) {
                    const s = SqlSocket(params.organization, params.project, params.database, dbSchema, dbUsername, dbPassword);
                    const results: SqlResponse = await s.runCommand("EXECUTE_QUERY", ["SELECT 1 FROM DUAL"]);
                    if (results.error) {
                        setResults(results);
                    }
                    else {
                        setSqlSocket(s);
                    }
                }
            }}>Login</Button>
            </div>
        </>;
    }

    function renderResults(results: SqlResponse) {
        if (results.error) {
            return <div className="NuoSqlError">{results.error.split("\n").map(line => <div>{line}</div>)}</div>
        }
        return <div><Table>
            <TableHead>
                <TableRow>
                    {results.columns?.map((column, index) => <TableTh key={index}>{column.name}</TableTh>)}
                </TableRow>
            </TableHead>
            <TableBody>
                {results.rows?.map((row, index) => <TableRow key={index}>
                    {row.values.map((col, cindex) => <TableCell key={cindex}>{col}</TableCell>)}
                </TableRow>)}
            </TableBody>
        </Table></div>
    }

    function renderQuery() {
        return <form>
            <div className="NuoRow NuoFieldContainer">
                <div className="NuoRowFixed">
                    <Select id="operation" label={props.t("field.operation.label")} value={operation} autoFocus={true} onChange={({ target: input }) => {
                        setOperation(input.value);
                    }} disabled={false}>
                        {SqlOperations.map((operation: string) => <SelectOption key={operation} value={operation}>{operation}</SelectOption>)}
                    </Select>
                </div>
                <TextField required data-testid="sqlQuery" id="sqlQuery" label="SQL Query" value={sqlQuery} onChange={(event) => setSqlQuery(event.target.value)} />
                <Button data-testid="submitSql" disabled={!sqlSocket} variant="contained" type="submit" onClick={onSubmitSql}>Submit</Button>
            </div>
        </form>;
    }

    return <PageLayout {...props}>
        <div className="NuoListResourceHeader">
            <h3>SQL Editor</h3>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                <StyledBreadcrumbs data-testid="path_component" separator=">" aria-label="resources" style={{ color: "#b5b9bc", fontSize: "1em", padding: "0 20px", display: "flex", flexWrap: "nowrap" }}>
                    <Typography key="management" color="text.primary" style={{ fontSize: "1em", textWrap: "nowrap" }}>{params.organization}</Typography>
                    <Typography key="management" color="text.primary" style={{ fontSize: "1em", textWrap: "nowrap" }}>{params.project}</Typography>
                    <Typography key="management" color="text.primary" style={{ fontSize: "1em", textWrap: "nowrap" }}>{params.database}</Typography>
                </StyledBreadcrumbs>
            </div>
        </div>
        {sqlSocket ? renderQuery() : renderLogin()}
        {results && renderResults(results)}
    </PageLayout>;
}

export default withTranslation()(SqlPage);
