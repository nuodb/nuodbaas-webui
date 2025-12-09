// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import DialogMaterial from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Auth from '../../../utils/auth';
import { useEffect, useState } from 'react';
import Button from '../../controls/Button';
import { t } from 'i18next';
import TextField from '../../controls/TextField';
import SqlSocket, { SqlImportResponseType, SqlType } from '../../../utils/SqlSocket';
import Toast from '../../controls/Toast';
import { sqlIdentifier, sqlString } from './SqlUtils';
import SqlRoleSelector, { RolesType } from './SqlRoleSelector';

type SqlRegisterUserProps = {
    onClose: (action: string)=>void;
    organization: string;
    project: string;
    database: string;
}

export default function SqlRegisterUser({onClose, organization, project, database}: SqlRegisterUserProps ) {
    const [adminUsername, setAdminUsername] = useState("");
    const [adminPassword, setAdminPassword] = useState("");
    const [conn, setConn] = useState<SqlType | undefined>(undefined);
    const [error, setError] = useState<string|undefined>();
    const newDbUser = Auth.getCredentials()?.username.replace("/", "_").replace(/[^a-zA-Z0-9_]/g, '');
    const [roles, setRoles] = useState<{ [role: string]: RolesType }>({});

    useEffect(() => {
        if (!conn) {
            setRoles({});
            return;
        }
        let sql = "SELECT r.schema, r.rolename FROM system.roles r";
        conn.runCommand("EXECUTE_QUERY", [sql]).then(sqlResponse => {
            if (sqlResponse.status === "SUCCESS" && sqlResponse.columns && sqlResponse.rows) {
                let roles: { [key: string]: RolesType } = {};
                sqlResponse.rows.forEach(row => {
                    roles[row.values[0] + "." + row.values[1]] = "disabled";
                })
                setRoles(roles);
            }
            else {
                Toast.show("Cannot retrieve roles: " + sqlResponse.error, sqlResponse.error);
                setRoles({});
            }
        });
    }, [conn]);

    function renderLoginPage() {
        return <>
            <div>{t("form.sqleditor.label.userNeedsRegistration")}</div>
            <div>&nbsp;</div>
            <div>{t("form.sqleditor.label.loginWithDbAdmin")}</div>
            <div className="NuoFieldContainer">
                <TextField
                    id="adminUsername"
                    label={t("form.sqleditor.label.dbAdmin.username")}
                    value={adminUsername}
                    onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setAdminUsername(event.currentTarget.value)}
                />
            </div>
            <div className="NuoFieldContainer">
                <TextField
                    id="adminPassword"
                    type="password"
                    label={t("form.sqleditor.label.dbAdmin.password")}
                    value={adminPassword}
                    onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setAdminPassword(event.currentTarget.value)}
                />
            </div>
        </>;
    }

    if (!newDbUser) {
        return null;
    }

    return <DialogMaterial open={true}>
        <DialogTitle>{t("form.sqleditor.label.setupLogin", { database: organization + "/" + project + "/" + database })}</DialogTitle>
        <DialogContent>
            <div>
                {!conn && renderLoginPage()}
                {conn && <SqlRoleSelector roles={roles} setRoles={setRoles} />}
                <div>&nbsp;</div>
                <div className="NuoSqlError">{error}</div>
            </div>
        </DialogContent>
        <DialogActions>
            <Button data-testid={"dialog_button_cancel"} variant="outlined" onClick={() => {
                onClose("");
            }}>
                {t("button.cancel")}
            </Button>
            {!conn && <Button data-testid={"dialog_button_login"} onClick={async () => {
                let socket = SqlSocket(organization, project, database, "user", adminUsername, adminPassword);
                let checkUser = await socket.runCommand("EXECUTE_QUERY", ["SELECT * FROM system.users WHERE username = " + sqlString(newDbUser)]);
                if (checkUser.status !== "SUCCESS") {
                    setError("Cannot login. " + checkUser.error);
                    return;
                }
                if (checkUser.rows && checkUser.rows.length > 0) {
                    setError(t("form.sqleditor.error.userExists"));
                    return;
                }
                setConn(socket);
                setError(undefined);
            }}>
                Next
            </Button>}
            {conn && <Button data-testid="dialog_button_register" onClick={async () => {
                let sql = "START TRANSACTION;";
                sql += "CREATE USER " + sqlIdentifier(newDbUser) + " EXTERNAL;"
                Object.keys(roles).filter(role => roles[role] !== "disabled").forEach(role => {
                    sql += "GRANT " + sqlIdentifier(role) + " TO " + sqlIdentifier(newDbUser);
                    if (roles[role] === "grant") {
                        sql += " WITH GRANT OPTION";
                    }
                    sql += ";";
                });
                sql += "COMMIT;"
                const response: SqlImportResponseType = await conn.sqlSimpleImport(sql);
                setError(response.error);
                if (!response.error) {
                    onClose("register");
                }
            }}>Register User</Button>}
        </DialogActions>
    </DialogMaterial>;
}
