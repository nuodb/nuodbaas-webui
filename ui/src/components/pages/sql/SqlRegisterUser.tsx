// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import DialogMaterial from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Select, { SelectOption } from '../../controls/Select';
import Auth from '../../../utils/auth';
import { useState } from 'react';
import Button from '../../controls/Button';
import { t } from 'i18next';
import TextField from '../../controls/TextField';
import SqlSocket, { SqlImportResponseType, SqlResponse } from '../../../utils/SqlSocket';
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
    const [access, setAccess] = useState("readonly");
    const [error, setError] = useState<string|undefined>();
        const newDbUser = Auth.getCredentials()?.username.replace("/", "_");
        return <DialogMaterial open={true}>
            <DialogTitle>{t("form.sqleditor.label.setupLogin", {database: organization + "/" + project + "/" + database})}</DialogTitle>
            <DialogContent>
                <div>
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
                    <div>&nbsp;</div>
                    {t("form.sqleditor.label.registerUserWith", {user: newDbUser})}
                    <div className="NuoFieldContainer">
                        <Select
                            id="access"
                            value={access}
                            onChange={(event) => {
                                setAccess(event.target.value);
                            }}>
                                <SelectOption value="readonly">{t("form.sqleditor.label.readPermissions")}</SelectOption>
                                <SelectOption value="fullaccess">{t("form.sqleditor.label.fullPermissions")}</SelectOption>
                        </Select>
                    </div>
                    <div className="NuoSqlError">{error}</div>
                </div>
            </DialogContent>
            <DialogActions>
                <Button data-testid={"dialog_button_register"} onClick={async () => {
                    const conn = SqlSocket(organization, project, database, "user", adminUsername, adminPassword);
                    let permissions = "GRANT SELECT ON ALL TABLES TO USER " + newDbUser;
                    if(access === "full") {
                        permissions = "GRANT ALL TO USER " + newDbUser;
                    }
                    const response: SqlImportResponseType = await conn.sqlSimpleImport("SET AUTOCOMMIT OFF; create user " + newDbUser + " external; " + permissions + "; COMMIT");
                    setError(response.error);
                    if (!response.error) {
                        onClose("register");
                    }
                }}>
                    {t("button.sql.register")}
                </Button>
                <Button data-testid={"dialog_button_cancel"} onClick={() => {
                    onClose("");
                }}>
                    {t("button.cancel")}
                </Button>
            </DialogActions>
        </DialogMaterial>;
    }
