// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React, { useState } from 'react';
import { useParams } from "react-router"
import { withTranslation } from "react-i18next";
import SqlSocket, { SqlResponse, SqlType } from '../../../utils/SqlSocket';
import TextField from '../../controls/TextField';
import Button from '../../controls/Button';
import { t } from 'i18next';
import SqlRegisterUser from './SqlRegisterUser';
import Auth from '../../../utils/auth';

type SqlLoginProps = {
    setSqlConnection: (conn: SqlType) => void;
    showRegistration?: boolean;
}

function SqlLogin({ setSqlConnection, showRegistration }: SqlLoginProps) {
    const params = useParams();
    const [dbUsername, setDbUsername] = useState("");
    const [dbPassword, setDbPassword] = useState("");
    const [dbSchema, setDbSchema] = useState("");
    const [error, setError] = useState<string|undefined>("");
    const [showRegisterUserDialog, setShowRegisterUserDialog] = useState(false);

    return <form>
        {params.organization && params.project && params.database && showRegisterUserDialog
            && <SqlRegisterUser
                organization={params.organization}
                project={params.project}
                database={params.database}
            onClose={async (action: string) => {
                    setShowRegisterUserDialog(false);
                const authUsername = Auth.getCredentials()?.username.replace("/", "_");
                const authPassword = Auth.getCredentials()?.token;
                if (action === "register" && params.organization && params.project && params.database && authUsername && authPassword) {
                    const conn = SqlSocket(params.organization, params.project, params.database, "user", authUsername, authPassword);
                    try {
                        const response: SqlResponse = await conn.runCommand("EXECUTE_QUERY", ["SELECT 1 FROM DUAL"]);
                        setError(response.error);
                        if (!response.error) {
                            setSqlConnection(conn);
                        }
                    }
                    catch (err) {
                        setError("catch " + JSON.stringify(err));
                    }
                }
                }}
            />
        }
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
        <div className="NuoFieldContainer NuoButtons">
            <Button data-testid="sql.login.button" type="submit" onClick={async () => {
                if (params.organization && params.project && params.database && dbUsername && dbPassword && dbSchema) {
                    const conn = SqlSocket(params.organization, params.project, params.database, dbSchema, dbUsername, dbPassword);
                    try {
                        const response: SqlResponse = await conn.runCommand("EXECUTE_QUERY", ["SELECT 1 FROM DUAL"]);
                        setError(response.error);
                        if (!response.error) {
                            setSqlConnection(conn);
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
            {showRegistration && <Button data-testid="sql.login.button" variant="outlined" onClick={async () => {
                setShowRegisterUserDialog(true);
            }}>{t("form.sqleditor.button.setupLogin")}</Button>}
        </div>
        <div className="NuoSqlError">{error}</div>
    </form>;
}

export default withTranslation()(SqlLogin);
