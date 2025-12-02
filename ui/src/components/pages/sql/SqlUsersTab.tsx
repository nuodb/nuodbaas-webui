// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

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
    roles: { [role: string]: boolean };
    origRoles: { [role: string]: boolean };
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
                LCASE(REPLACE(LISTAGG(IfNull(CONCAT(ur.roleschema, '.', ur.rolename), ''), ','), ',', CHAR(10))) AS "Roles",
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

    // returns {[rolename: string]: (enabled: boolean)} for the given user
    // i.e. {administrator:true, role1: false}
    async function getRoles(username: string | undefined): Promise<{ [role: string]: boolean }> {
        let sql = "SELECT r.schema, r.rolename, NULL FROM system.roles r";
        if (username) {
            sql = `
            SELECT r.schema, r.rolename, ur.username
            FROM system.roles r
            FULL JOIN (
                SELECT username,rolename FROM system.userroles WHERE username=` + sqlString(username) + `
            ) ur
            ON ur.rolename = r.rolename`
        }
        let sqlResponse = await sqlConnection.runCommand("EXECUTE_QUERY", [sql]);
        if (sqlResponse.status === "SUCCESS" && sqlResponse.columns && sqlResponse.rows) {
            let roles: { [key: string]: boolean } = {};
            sqlResponse.rows.forEach(row => {
                if (row.values.length === 3) {
                    const role = (row.values[0] + "." + row.values[1]).toLowerCase();
                    if (username) {
                        roles[role] = String(row.values[2]).toLowerCase() === username.toLowerCase();
                    }
                    else {
                        roles[role] = false;
                    }
                }
            })
            return Promise.resolve(roles);
        }
        else if (editDialogProps) {
            let newEditDialogProps: EditDialogProps = { ...editDialogProps, error: ("Unable to retrieve roles: " + sqlResponse.error) };
            setEditDialogProps(newEditDialogProps);
        }
        return Promise.resolve({});
    }

    function renderUserRoles() {
        if (!editDialogProps) {
            return null;
        }
        return <>User Roles:
            {Object.keys(editDialogProps.roles).map(roleKey => {
                return <div className="NuoRow"><input type="checkbox" name={roleKey} checked={editDialogProps.roles[roleKey]} onChange={() => {
                    let newEditDialogProps = { ...editDialogProps };
                    newEditDialogProps.roles = { ...newEditDialogProps.roles };
                    newEditDialogProps.roles[roleKey] = !newEditDialogProps.roles[roleKey];
                    setEditDialogProps(newEditDialogProps);
                }} />{roleKey}</div>;
            })}
        </>
    }

    function renderError() {
        return editDialogProps?.error && <div className="NuoError">{editDialogProps.error}</div>
    }

    function renderCreateDialog() {
        if (!editDialogProps || editDialogProps.type !== "create") {
            return null;
        }
        return <DialogMaterial open={true}>
            <DialogTitle>{"Create User"}</DialogTitle>
            <DialogContent>
                {renderError()}
            </DialogContent>
            <DialogActions>
                <Button data-testid="dialog_button_local" onClick={() => {
                    setEditDialogProps({ ...editDialogProps, type: "create_local" });
                }}>Create Database User</Button>
                <Button data-testid="dialog_button_dbaas" onClick={async () => {
                    const users: string[] = (await Rest.get("/users?listAccessible=true") as any).items;
                    setEditDialogProps({ ...editDialogProps, type: "add_dbaas", allDbaasUsers: users });
                }}>Add DBaaS User</Button>
                <Button data-testid="dialog_button_dbaas" onClick={async () => {
                    setEditDialogProps(undefined);
                }}>Cancel</Button>
            </DialogActions>
        </DialogMaterial>
    }

    function renderCreateLocalDialog() {
        if (!editDialogProps || editDialogProps.type !== "create_local") {
            return null;
        }
        return <DialogMaterial open={true}>
            <DialogTitle>{"Create local user"}</DialogTitle>
            <DialogContent>
                <div className="NuoColumn">
                    <div className="NuoFieldContainer">
                        <TextField
                            id="username"
                            label="Username"
                            value={editDialogProps.username}
                            onChange={(event) => {
                                setEditDialogProps({ ...editDialogProps, username: event.currentTarget.value });
                            }}
                        />
                    </div>
                    <div className="NuoFieldContainer">
                        <TextField
                            id="password"
                            label="Password"
                            type="password"
                            value={editDialogProps.password || ""}
                            onChange={(event) => {
                                setEditDialogProps({ ...editDialogProps, password: event.currentTarget.value });
                            }}
                        />
                    </div>
                    {renderUserRoles()}
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
                            if (editDialogProps.roles[role]) {
                                sql += "GRANT " + sqlIdentifier(role) + " TO " + sqlIdentifier(editDialogProps.username) + ";";
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
                    Create
                </Button>
                <Button data-testid="dialog_button_cancel" onClick={() => {
                    setEditDialogProps(undefined);
                }}>Cancel</Button>
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
            <DialogTitle>{"Add DBaaS user to database"}</DialogTitle>
            <DialogContent>
                <div className="NuoColumn">
                    <div className="NuoFieldContainer">
                        <Select
                            id="username"
                            label="Username"
                            value={editDialogProps.username}
                            onChange={(event) => {
                                console.log("onChange", event);
                                setEditDialogProps({ ...editDialogProps, username: event.target.value });
                            }}
                        >
                            {editDialogProps.allDbaasUsers?.map(user => (
                                <SelectOption value={user.replace("/", "_").toLowerCase()}>{user.toLowerCase()}</SelectOption>
                            ))}
                        </Select>
                    </div>
                    {renderUserRoles()}
                    {renderError()}
                </div>
            </DialogContent>
            <DialogActions>
                <Button data-testid="dialog_button_save" onClick={async () => {
                    let sql = "START TRANSACTION;";
                    sql += "CREATE USER " + sqlIdentifier(editDialogProps.username) + " EXTERNAL;";
                    Object.keys(editDialogProps.roles).forEach(role => {
                        if (editDialogProps.roles[role] && !editDialogProps.origRoles[role]) {
                            sql += "GRANT " + sqlIdentifier(role) + " TO " + sqlIdentifier(editDialogProps.username) + ";";
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
                }}>Add</Button>
                <Button data-testid="dialog_button_cancel" onClick={() => {
                    setEditDialogProps(undefined);
                }}>Cancel</Button>
            </DialogActions>
        </DialogMaterial>;
    }

    function renderEditDialog() {
        if (!editDialogProps || editDialogProps.type !== "edit") {
            return null;
        }
        return <DialogMaterial open={true}>
            <DialogTitle>{"Edit User " + editDialogProps.username}</DialogTitle>
            <DialogContent>
                <div className="NuoColumn">
                    <div className="NuoFieldContainer">
                        <TextField
                            id="username"
                            label="Username"
                            value={editDialogProps.username}
                            onChange={(event) => {
                                setEditDialogProps({ ...editDialogProps, username: event.currentTarget.value });
                            }}
                            disabled={editDialogProps.type === "edit"}
                        />
                    </div>
                    {renderUserRoles()}
                    {renderError()}
                </div>
            </DialogContent>
            <DialogActions>
                <Button data-testid="dialog_button_save" onClick={async () => {
                    let sql = "";
                    Object.keys(editDialogProps.roles).forEach(role => {
                        if (editDialogProps.roles[role] && !editDialogProps.origRoles[role]) {
                            sql += "GRANT " + sqlIdentifier(role) + " TO " + sqlIdentifier(editDialogProps.username) + ";";
                        }
                        else if (!editDialogProps.roles[role] && editDialogProps.origRoles[role]) {
                            sql += "REVOKE " + sqlIdentifier(role) + " FROM " + sqlIdentifier(editDialogProps.username) + ";";
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
                }}>Save</Button>
                <Button data-testid="dialog_button_cancel" onClick={() => {
                    setEditDialogProps(undefined);
                }}>Cancel</Button>
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
    return <div className="NuoTableScrollWrapper">
        {renderCreateDialog()}
        {renderCreateLocalDialog()}
        {renderAddDbaasDialog()}
        {renderEditDialog()}
        <SqlResultsRender
            results={state.sqlResponse}
            onAdd={async () => {
                const roles = await getRoles(undefined);
                setEditDialogProps({ roles, origRoles: roles, username: "", type: "create" });
            }}
            onEdit={async (username: string) => {
                const roles = await getRoles(username);
                setEditDialogProps({ roles, origRoles: roles, username, type: "edit" });
            }}
            onDelete={(username: string) => {
                handleDelete(username);
            }}
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
