// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React, { useEffect, useState } from 'react';
import { withTranslation } from "react-i18next";
import { t } from 'i18next';
import { SqlOperations, SqlOperationType, SqlResponse, SqlType } from '../../../utils/SqlSocket';
import Select, { SelectOption } from '../../controls/Select';
import TextField from '../../controls/TextField';
import Button from '../../controls/Button';
import SqlResultsRender from './SqlResultsRender';
import Toast from '../../controls/Toast';

type SqlQueryTabProps = {
    sqlConnection: SqlType;
    dbTable: string;
}
function SqlQueryTab({sqlConnection, dbTable}: SqlQueryTabProps) {
    const [operation, setOperation] = useState<SqlOperationType>("EXECUTE_QUERY");
    const [results, setResults] = useState<SqlResponse|undefined>(undefined);
    const [sqlQuery, setSqlQuery] = useState("");

    useEffect(()=>{
        setSqlQuery("select * from `" + dbTable + "` limit 100");
        setResults(undefined);
    }, [dbTable]);

    return <><form>
        <div className="NuoRow NuoFieldContainer">
            <div className="NuoRowFixed">
                <Select id="operation" label={t("field.label.sql.operation")} value={operation} autoFocus={true} onChange={({ target: input }) => {
                    setOperation(input.value);
                }} disabled={false}>
                    {SqlOperations.map((operation: string) => <SelectOption key={operation} value={operation}>{operation}</SelectOption>)}
                </Select>
            </div>
            <TextField required data-testid="sqlQuery" id="sqlQuery" label="SQL Query" value={sqlQuery} onChange={(event: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => setSqlQuery(event.target.value)} />
            <Button data-testid="submitSql" disabled={!sqlConnection} variant="contained" type="submit" onClick={async ()=>{
                const response: SqlResponse = await sqlConnection.runCommand(operation, [sqlQuery]);
                if (response.status === "SUCCESS") {
                    let shortQuery = sqlQuery.replaceAll("\n", " ");
                    if (shortQuery.length > 80) {
                        shortQuery = shortQuery.substring(0, 80) + "...";
                    }
                    Toast.show("SUCCESS: " + shortQuery, null);
                }
                setResults(response);
            }}>Submit</Button>
        </div>
    </form>
    <SqlResultsRender results={results} />
    </>;
}

export default withTranslation()(SqlQueryTab);
