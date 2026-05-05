// (C) Copyright 2025-2026 Dassault Systemes SE.  All Rights Reserved.

import { withTranslation } from "react-i18next";
import { SqlResponse, SqlType } from "../../../utils/SqlSocket";
import SqlResultsRender from "./SqlResultsRender";
import Pagination from "../../controls/Pagination";
import React, { useEffect, useState } from "react";
import Dialog from "../parts/Dialog";
import Toast from "../../controls/Toast";
import DialogMaterial from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Button from "../../controls/Button";
import TextField from "../../controls/TextField";
import Select, { SelectOption } from "../../controls/Select";
import { Rest } from "../parts/Rest";
import AddIcon from '@mui/icons-material/Add';
import { sqlIdentifier, sqlString } from "./SqlUtils";
import Auth from "../../../utils/auth";
import SqlRoleSelector, { getRoles, RolesType } from "./SqlRoleSelector";

type SqlUsersTabProps = {
    sqlConnection: SqlType;
    t: any;
};

type SqlResponseState = {
    sqlResponse: SqlResponse|undefined;
    page: number;
    lastPage: number;
    orderBy?: string;
    isAscending: boolean;
};

type EditDialogProps = {
    roles: { [role: string]: RolesType };
    origRoles: { [role: string]: RolesType };
    username: string;
    password?: string;
    type: "create" | "edit" | "create_local" | "add_dbaas";
    allDbaasUsers?: string[];
    error?: string;
} | undefined;

function SqlUsersTab({ sqlConnection, t }: SqlUsersTabProps) {
    const [state, setState] = useState<SqlResponseState>({ sqlResponse: undefined, page: 1, lastPage: 1, orderBy: "", isAscending: true });
    const [editDialogProps, setEditDialogProps] = useState<EditDialogProps>(undefined);
    const DEFAULT_PAGE_SIZE = 100;

    useEffect(()=> {
        const newState = { ...state, page: 1, lastPage: 1, orderBy: "" };
        refreshResults(newState);
    }, []);

    async function refreshResults(args: SqlResponseState) {
        const { page, orderBy, isAscending } = args;

        let sqlQuery = `
            select
                LCASE(p.username) as "Username",
                LCASE(REPLACE(LISTAGG(IfNull(CONCAT(
                    ur.roleschema,
                    '.',
                    ur.rolename,
                    CASE WHEN ur.options = '0' THEN
                        ''
                    ELSE ' (with grant)'
                    END
                ), ''), ','), ',', CHAR(10))) AS "Roles",
                CASE WHEN
                    p.verifier IS NULL
                THEN
                    REPLACE(LCASE(p.username),'_','/')
                ELSE
                    ''
                END AS "DBaaS Username"
            from
                system.passwords p
                left join system.userroles ur
                    on p.username = ur.username
            GROUP BY
                p.username, p.verifier`;

        if (orderBy) {
            sqlQuery += " ORDER BY `" + orderBy + "` " + (isAscending ? "ASC" : "DESC");
        }
        const sqlQueryWithLimit = sqlQuery + " limit " + String(DEFAULT_PAGE_SIZE) + " offset " + String((page - 1) * DEFAULT_PAGE_SIZE);
        const sqlResponse = await sqlConnection.runCommand("EXECUTE_QUERY", [sqlQueryWithLimit]);
        let newState: SqlResponseState = {
            ...args,
            sqlResponse,
        };
        if(sqlResponse.status === "SUCCESS" && sqlResponse.rows && sqlResponse.rows.length === DEFAULT_PAGE_SIZE) {
            const countResults = await sqlConnection.runCommand("EXECUTE_QUERY", ["SELECT count(*) FROM (" + sqlQuery + ") total"]);
            if(countResults.status === "SUCCESS" && countResults.rows && countResults.rows[0] && countResults.rows[0].values) {
                const totalRows = countResults.rows[0].values[0];
                newState.lastPage = Math.ceil(totalRows / DEFAULT_PAGE_SIZE);
            }
        }
        else if (sqlResponse.rows && sqlResponse.rows.length === 0) {
            newState.lastPage = 1;
        }

        setState(newState);
    }

    function renderError() {
        return editDialogProps?.error && <div className="NuoError">{editDialogProps.error}</div>
    }

    function renderCreateDialog() {
        if (!editDialogProps || editDialogProps.type !== "create") {
            return null;
        }
        return <DialogMaterial open={true}>
            <DialogTitle>{t("form.sqleditor.label.createUser")}</DialogTitle>
            <DialogContent>
                {renderError()}
            </DialogContent>
            <DialogActions>
                <Button data-testid="dialog_button_local" onClick={() => {
                    setEditDialogProps({ ...editDialogProps, type: "create_local" });
                }}>{t("form.sqleditor.button.createDatabaseUser")}</Button>
                <Button data-testid="dialog_button_dbaas" onClick={async () => {
                    const users: string[] = (await Rest.get("/users?listAccessible=true") as any).items;
                    const existingUsers: string[] = state.sqlResponse?.rows?.map(row => row.values[0].replace("_", "/")) || []
                    const filteredUsers = users.filter(user => {
                        if (user.startsWith("system/")) {
                            return false;
                        }
                        if (existingUsers.includes(user)) {
                            return false;
                        }
                        return true;
                    })
                    const loggedInOrg = Auth.getCredentials()?.username.split("/")[0] || "";
                    const sortedUsers = filteredUsers.sort((a: string, b: string) => {
                        const orgA = a.split("/")[0];
                        const orgB = b.split("/")[0];
                        if (orgA === loggedInOrg && orgB !== loggedInOrg) {
                            return -1;
                        }
                        else if (orgB === loggedInOrg) {
                            return 1;
                        }
                        else if (a < b) {
                            return -1;
                        }
                        else if (a > b) {
                            return 1;
                        }
                        else {
                            return 0;
                        }
                    });
                    setEditDialogProps({ ...editDialogProps, type: "add_dbaas", allDbaasUsers: sortedUsers });
                }}>{t("form.sqleditor.button.addDbaasUser")}</Button>
                <Button data-testid="dialog_button_cancel" onClick={async () => {
                    setEditDialogProps(undefined);
                }}>{t("button.cancel")}</Button>
            </DialogActions>
        </DialogMaterial>
    }

    function renderCreateLocalDialog() {
        if (!editDialogProps || editDialogProps.type !== "create_local") {
            return null;
        }
        return <DialogMaterial open={true}>
            <DialogTitle>{t("form.sqleditor.button.createDatabaseUser")}</DialogTitle>
            <DialogContent>
                <div className="NuoColumn">
                    <div className="NuoFieldContainer">
                        <TextField
                            id="username"
                            label={t("field.label.username")}
                            value={editDialogProps.username}
                            onChange={(event) => {
                                setEditDialogProps({ ...editDialogProps, username: event.currentTarget.value });
                            }}
                        />
                    </div>
                    <div className="NuoFieldContainer">
                        <TextField
                            id="password"
                            label={t("field.label.password")}
                            type="password"
                            value={editDialogProps.password || ""}
                            onChange={(event) => {
                                setEditDialogProps({ ...editDialogProps, password: event.currentTarget.value });
                            }}
                        />
                    </div>
                    <SqlRoleSelector roles={editDialogProps.roles} setRoles={(roles) => setEditDialogProps({ ...editDialogProps, roles })} />
                    {renderError()}
                </div>
            </DialogContent>
            <DialogActions>
                <Button
                    data-testid="dialog_button_save"
                    disabled={!editDialogProps.username || !editDialogProps.password}
                    onClick={async () => {
                        if (!editDialogProps.password) {
                            return;
                        }
                        let sql = "START TRANSACTION;";
                        sql += "CREATE USER " + sqlIdentifier(editDialogProps.username) + " PASSWORD " + sqlString(editDialogProps.password) + ";";
                        Object.keys(editDialogProps.roles).forEach(role => {
                            if (editDialogProps.roles[role] !== "disabled") {
                                sql += "GRANT " + sqlIdentifier(role) + " TO " + sqlIdentifier(editDialogProps.username);
                                if (editDialogProps.roles[role] === "grant") {
                                    sql += " WITH GRANT OPTION";
                                }
                                sql += ";";
                            }
                        });
                        sql += "COMMIT;";
                        let sqlResponse = await sqlConnection.runCommand("EXECUTE", [sql]);
                        if (sqlResponse.status === "SUCCESS") {
                            Toast.show("User " + editDialogProps.username + " created", undefined);
                            refreshResults(state);
                            setEditDialogProps(undefined);
                        }
                        else {
                            setEditDialogProps({ ...editDialogProps, error: "User creation failed: " + sqlResponse.error });
                        }
                    }}
                >
                    {t("button.create")}
                </Button>
                <Button data-testid="dialog_button_cancel" onClick={() => {
                    setEditDialogProps(undefined);
                }}>{t("button.cancel")}</Button>
            </DialogActions>
        </DialogMaterial>
    }

    function renderAddDbaasDialog() {
        if (!editDialogProps || editDialogProps.type !== "add_dbaas") {
            return null;
        }

        return <DialogMaterial
            open={true}
        >
            <DialogTitle>{t("form.sqleditor.label.addDbaasUserToDatabase")}</DialogTitle>
            <DialogContent>
                <div className="NuoColumn">
                    <div className="NuoFieldContainer">
                        <Select
                            id="username"
                            label={t("field.label.username")}
                            value={editDialogProps.username}
                            onChange={(event) => {
                                setEditDialogProps({ ...editDialogProps, username: event.target.value });
                            }}
                        >
                            {editDialogProps.allDbaasUsers?.map(user => (
                                <SelectOption value={user.replace("/", "_").toLowerCase()}>{user.toLowerCase()}</SelectOption>
                            ))}
                        </Select>
                    </div>
                    {editDialogProps.username && <SqlRoleSelector roles={editDialogProps.roles} setRoles={(roles) => setEditDialogProps({ ...editDialogProps, roles })} />}
                    {renderError()}
                </div>
            </DialogContent>
            <DialogActions>
                <Button data-testid="dialog_button_cancel" variant="outlined" onClick={() => {
                    setEditDialogProps(undefined);
                }}>{t("button.cancel")}</Button>
                <Button
                    data-testid="dialog_button_save"
                    onClick={async () => {
                        let sql = "START TRANSACTION;";
                        sql += "CREATE USER " + sqlIdentifier(editDialogProps.username) + " EXTERNAL;";
                        Object.keys(editDialogProps.roles).forEach(role => {
                            if (editDialogProps.roles[role] !== "disabled") {
                                sql += "GRANT " + sqlIdentifier(role) + " TO " + sqlIdentifier(editDialogProps.username);
                                if (editDialogProps.roles[role] === "grant") {
                                    sql += " WITH GRANT OPTION";
                                }
                                sql += ";";
                            }
                        });
                        sql += "COMMIT;"
                        if (sql) {
                            let sqlResponse = await sqlConnection.runCommand("EXECUTE", [sql]);
                            if (sqlResponse.status === "SUCCESS") {
                                Toast.show("DBaaS user added to database", undefined);
                                refreshResults(state);
                                setEditDialogProps(undefined);
                            }
                            else {
                                setEditDialogProps({ ...editDialogProps, error: "Adding DBaaS user failed: " + sqlResponse.error });
                            }
                        }
                    }}
                    disabled={!editDialogProps.username}
                >{t("button.add")}</Button>
            </DialogActions>
        </DialogMaterial>;
    }

    function renderEditDialog() {
        if (!editDialogProps || editDialogProps.type !== "edit") {
            return null;
        }
        return <DialogMaterial open={true}>
            <DialogTitle>{t("form.sqleditor.label.editUser", {username: editDialogProps.username})}</DialogTitle>
            <DialogContent>
                <div className="NuoColumn">
                    <div className="NuoFieldContainer">
                        <TextField
                            id="username"
                            label={t("field.label.username")}
                            value={editDialogProps.username}
                            onChange={(event) => {
                                setEditDialogProps({ ...editDialogProps, username: event.currentTarget.value });
                            }}
                            disabled={editDialogProps.type === "edit"}
                        />
                    </div>
                    <SqlRoleSelector roles={editDialogProps.roles} setRoles={(roles) => setEditDialogProps({ ...editDialogProps, roles })} />
                    {renderError()}
                </div>
            </DialogContent>
            <DialogActions>
                <Button data-testid="dialog_button_save" onClick={async () => {
                    let sql = "";
                    Object.keys(editDialogProps.roles).forEach(role => {
                        if (editDialogProps.roles[role] === editDialogProps.origRoles[role]) {
                            // no change
                        }
                        else if (editDialogProps.roles[role] === "disabled") {
                            // revoke role
                            sql += "REVOKE " + sqlIdentifier(role) + " FROM " + sqlIdentifier(editDialogProps.username) + ";";
                        }
                        else if (editDialogProps.roles[role] === "enabled") {
                            sql += "GRANT " + sqlIdentifier(role) + " TO " + sqlIdentifier(editDialogProps.username) + ";";
                        }
                        else if (editDialogProps.roles[role] === "grant") {
                            sql += "GRANT " + sqlIdentifier(role) + " TO " + sqlIdentifier(editDialogProps.username) + " WITH GRANT OPTION;";
                        }
                    });
                    if (sql) {
                        sql = "START TRANSACTION;" + sql + "COMMIT;";
                        let sqlResponse = await sqlConnection.runCommand("EXECUTE", [sql]);
                        if (sqlResponse.status === "SUCCESS") {
                            Toast.show("User updated", undefined);
                            refreshResults(state);
                            setEditDialogProps(undefined);
                        }
                        else {
                            setEditDialogProps({ ...editDialogProps, error: "User update failed: " + sqlResponse.error });
                        }
                    }
                }}>{t("button.save")}</Button>
                <Button data-testid="dialog_button_cancel" onClick={() => {
                    setEditDialogProps(undefined);
                }}>{t("button.cancel")}</Button>
            </DialogActions>
        </DialogMaterial>
    }

    async function handleDelete(username: string) {
        const i18nData = {
            username: username,
            database: sqlConnection.getOrgProjDb(),
        };
        if ("yes" === await Dialog.confirm(
            t("form.sqleditor.label.delete.user.title", i18nData),
            t("form.sqleditor.label.delete.user.body", i18nData), t)) {
            sqlConnection.runCommand("EXECUTE", ["DROP USER " + sqlIdentifier(username)])
                .then(sqlResponse => {
                    if (sqlResponse.status === "SUCCESS") {
                        Toast.show(t("form.sqleditor.label.user.deleted", i18nData), undefined);
                        refreshResults(state);
                    }
                    else {
                        Dialog.ok(t("form.sqleditor.label.user.delete.failed", i18nData), sqlResponse.error, t);
                    }
                });
        }
    }

    if(!state.sqlResponse || state.sqlResponse.error) {
        return <SqlResultsRender results={state.sqlResponse} />
    }

    function equalsIgnoreCase(a: string | undefined | null, b: string | undefined | null) {
        if (!a && !b) {
            return true;
        }
        if (!a || !b) {
            return false;
        }
        return a.toLowerCase() === b.toLowerCase();
    }

    return <div className="NuoTableScrollWrapper">
        {renderCreateDialog()}
        {renderCreateLocalDialog()}
        {renderAddDbaasDialog()}
        {renderEditDialog()}
        <SqlResultsRender
            results={state.sqlResponse}
            onAdd={async () => {
                const roles = await getRoles(undefined, sqlConnection, (error: string) => editDialogProps && setEditDialogProps({ ...editDialogProps, error }));
                setEditDialogProps({ roles, origRoles: roles, username: "", type: "create" });
            }}
            onEdit={async (username: string) => {
                const roles = await getRoles(username, sqlConnection, (error: string) => editDialogProps && setEditDialogProps({ ...editDialogProps, error }));
                setEditDialogProps({ roles, origRoles: roles, username, type: "edit" });
            }}
            onEditDisabled={(username: string) => equalsIgnoreCase(username, "dba")}
            onDelete={(username: string) => {
                handleDelete(username);
            }}
            onDeleteDisabled={(username: string) => equalsIgnoreCase(username, "dba") || equalsIgnoreCase(username, sqlConnection.getDbUsername())}
            addLabel={<><AddIcon />New User</>}
        />
        <Pagination
            count={state.lastPage}
            page={state.page}
            setPage={(page) => {
                refreshResults({ ...state, page });
            }}
        />
    </div>
}

export default withTranslation()(SqlUsersTab);
