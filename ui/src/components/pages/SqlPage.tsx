// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React, { useState } from 'react';
import { useParams } from "react-router"
import { PageProps } from "../../utils/types";
import PageLayout from "./parts/PageLayout";
import { withTranslation } from "react-i18next";
import Button from '../controls/Button';
import TextField from '../controls/TextField';
import Select, { SelectOption } from '../controls/Select';
import SqlWebsocket, { SqlWebsocketOperations, SqlWebsocketType } from '../../utils/SqlWebsocket';

function SqlPage(props: PageProps) {
    const params = useParams();
    const [operation, setOperation] = useState("EXECUTE_QUERY");
    const [sqlQuery, setSqlQuery] = useState("");
    const websocket: SqlWebsocketType | undefined | void | "" = params.organization && params.project && params.database && params.schema && SqlWebsocket(params.organization, params.project, params.database, params.schema);

    function onSubmitSql() {
        if(websocket) {
            websocket.executeQuery(sqlQuery);
        }
    }

    return <PageLayout {...props}>
        {params.organization}/{params.project}/{params.database}/{params.schema}
        <form>
            <div className="NuoRow">
                <div className="NuoRowFixed">
                <Select id="operation" label={props.t("field.operation.label")} value={operation} autoFocus={true} onChange={({ target: input }) => {
                    setOperation(input.value);}} disabled={false}>
                    {Object.keys(SqlWebsocketOperations).filter(key=>isNaN(Number(key))).map(operation=> <SelectOption key={operation} value={operation}>{operation}</SelectOption>)}
                </Select></div>
                <TextField required data-testid="sqlQuery" id="sqlQuery" label="SQL Query" value={sqlQuery} onChange={(event) => setSqlQuery(event.target.value)} />
                <Button data-testid="submitSql" disabled={!websocket} variant="contained" type="submit" onClick={onSubmitSql}>Login</Button>
            </div>
        </form>
    </PageLayout>;
}

export default withTranslation()(SqlPage);
