// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import DialogMaterial from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Select, { SelectOption } from '../../controls/Select';
import Auth from '../../../utils/auth';
import { useEffect, useState } from 'react';
import Button from '../../controls/Button';
import { t } from 'i18next';
import TextField from '../../controls/TextField';
import SqlSocket, { SqlImportResponseType, SqlResponse, SqlType } from '../../../utils/SqlSocket';
import { setConstantValue } from 'typescript';
//                const selectedButton = await Dialog.show(, renderSetupLogin(), [{ id: "ok", label: "Ok" }, { id: "cancel", label: "Cancel" }], t);

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
    const [roles, setRoles] = useState<{ [roleName: string]: boolean }>({});

    function renderLoginPage() {
        return <>
            <div>To setup automatic login, the DBaaS user needs to be registered in the database.</div>
            <div>&nbsp;</div>
            <div>Login with a database administrator account:</div>
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

    type RoleSelectorProps = {
        username: string;
        roles: { [key: string]: boolean };
        setRoles: (roles: { [key: string]: boolean }) => void;
    };

    function RoleSelector({ username, roles, setRoles }: RoleSelectorProps) {
        useEffect(() => {
            if (conn) {
                let sql = "SELECT r.schema, r.rolename, NULL FROM system.roles r";
                conn.runCommand("EXECUTE_QUERY", [sql]).then((sqlResponse) => {
                    if (sqlResponse.status === "SUCCESS" && sqlResponse.columns && sqlResponse.rows) {
                        let roles: { [key: string]: boolean } = {};
                        sqlResponse.rows.forEach(row => {
                            roles[row.values[0] + "." + row.values[1]] = false;
                        })
                        setRoles(roles);
                        setError(undefined);
                    }
                    else {
                        setError("Cannot retrieve roles: " + sqlResponse.error);
                    }
                })
            }
        }, []);

        return <>Select Roles to be added to the user account {username}:
            {Object.keys(roles).map((roleKey: string) => {
                return <div className="NuoRow"><input type="checkbox" name={roleKey} checked={roles[roleKey]} onChange={() => {
                    let newRoles = { ...roles };
                    newRoles[roleKey] = !newRoles[roleKey];
                    setRoles(newRoles);
                }} />{roleKey}</div>;
            })}
        </>
    }

    return <DialogMaterial open={true}>
        <DialogTitle>{t("form.sqleditor.label.setupLogin", { database: organization + "/" + project + "/" + database })}</DialogTitle>
        <DialogContent>
            <div>
                {!conn && renderLoginPage()}
                {conn && <RoleSelector username={newDbUser || ""} roles={roles} setRoles={setRoles} />}
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
                let checkUser = await socket.runCommand("EXECUTE_QUERY", ["select * from system.users where `username` = '" + newDbUser + "'"]);
                if (checkUser.status !== "SUCCESS") {
                    setError("Cannot login. " + checkUser.error);
                    return;
                }
                if (checkUser.rows && checkUser.rows.length > 0) {
                    setError("User exists already.");
                    return;
                }
                setConn(socket);
                setError(undefined);
            }}>
                Next
            </Button>}
            {conn && <Button data-testid="dialog_button_register" onClick={async () => {
                let sql = "SET AUTOCOMMIT OFF;";
                sql += "CREATE USER " + newDbUser + " EXTERNAL;"
                Object.keys(roles).filter(role => roles[role]).forEach(role => {
                    sql += "GRANT '" + role + "' to " + newDbUser + ";";
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
