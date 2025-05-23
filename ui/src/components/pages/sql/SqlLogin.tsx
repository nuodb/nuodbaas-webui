// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React, { useState } from 'react';
import { useParams } from "react-router"
import { withTranslation } from "react-i18next";
import SqlSocket, { SqlResponse, SqlType } from '../../../utils/SqlSocket';
import TextField from '../../controls/TextField';
import Button from '../../controls/Button';
import { t } from 'i18next';
import { setDefaultResultOrder } from 'dns';

type SqlLoginProps = {
    setSqlConnection: (conn: SqlType) => void;
}

function SqlLogin({setSqlConnection}: SqlLoginProps) {
    const params = useParams();
    const [dbUsername, setDbUsername] = useState("");
    const [dbPassword, setDbPassword] = useState("");
    const [dbSchema, setDbSchema] = useState("");
    const [error, setError] = useState<string|undefined>("");

    return <>
        <div className="NuoFieldContainer">
            <TextField
                id="dbUsername"
                label={t("form.sqleditor.label.dbUsername")}
                value={dbUsername}
                onChange={(event: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => setDbUsername(event.currentTarget.value)}
            />
        </div>
        <div className="NuoFieldContainer">
            <TextField
                id="dbPassword"
                type="password"
                label={t("form.sqleditor.label.dbPassword")}
                value={dbPassword}
                onChange={(event: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => setDbPassword(event.currentTarget.value)}
            />
        </div>
        <div className="NuoFieldContainer">
            <TextField
                id="dbSchema"
                label={t("form.sqleditor.label.dbSchema")}
                value={dbSchema}
                onChange={(event: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => setDbSchema(event.currentTarget.value)}
            />
        </div>
        <div className="NuoFieldContainer">
        <Button disabled={!params.organization || !params.project || !params.database || !dbUsername || !dbPassword || !dbSchema} onClick={async () => {
            if (params.organization && params.project && params.database && dbSchema) {
                const conn = SqlSocket(params.organization, params.project, params.database, dbSchema, dbUsername, dbPassword);
                const response: SqlResponse = await conn.runCommand("EXECUTE_QUERY", ["SELECT 1 FROM DUAL"]);
                setError(response.error);
                if(!response.error) {
                    setSqlConnection(conn);
                }
            }
        }}>Login</Button>
        </div>
        <div className="NuoSqlError">{error}</div>
    </>;
}

export default withTranslation()(SqlLogin);
