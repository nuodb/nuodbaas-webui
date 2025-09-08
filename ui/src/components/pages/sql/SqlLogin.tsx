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

    return <form>
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
            <Button data-testid="sql.login.button" type="submit" onClick={async () => {
                setError("DEBUG click");
                if (params.organization && params.project && params.database && dbUsername && dbPassword && dbSchema) {
                    setError("DEBUG click2");
                    const conn = SqlSocket(params.organization, params.project, params.database, dbSchema, dbUsername, dbPassword);
                    setError("DEBUG click3");
                    try {
                        const response: SqlResponse = await conn.runCommand("EXECUTE_QUERY", ["SELECT 1 FROM DUAL"]);
                        setError("DEBUG click4");
                        setError(response.error);
                        if (!response.error) {
                            setSqlConnection(conn);
                            setError("DEBUG connected");
                        }
                        else {
                            setError("DEBUG not connected");
                        }
                    }
                    catch (err) {
                        setError("catch " + JSON.stringify(err));
                    }
                }
                else {
                    setError(t("form.sqleditor.label.allFieldsRequired"))
                }
            }}>{t("form.sqleditor.button.login")}</Button>
        </div>
        <div className="NuoSqlError">{error}</div>
    </form>;
}

export default withTranslation()(SqlLogin);
