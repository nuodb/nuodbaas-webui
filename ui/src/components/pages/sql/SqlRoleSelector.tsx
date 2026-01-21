// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import { SqlType } from "../../../utils/SqlSocket";
import { sqlString } from "./SqlUtils";

export type RolesType = "disabled" | "enabled" | "grant"

type RoleSelectorProps = {
    roles: {[role:string]: RolesType}
    setRoles: (roles: {[role:string]: RolesType})=>void;
}

// returns {[rolename: string]: (enabled: boolean)} for the given user
// i.e. {administrator:true, role1: false}
export async function getRoles(username: string | undefined, sqlConnection: SqlType, setError: (error:string)=>void): Promise<{ [role: string]: RolesType }> {
    let sql = "SELECT r.schema, r.rolename, NULL, NULL FROM system.roles r";
    if (username) {
        sql = `
        SELECT r.schema, r.rolename, ur.username, ur.options
        FROM system.roles r
        LEFT JOIN (
            SELECT username,rolename,options FROM system.userroles WHERE username=` + sqlString(username) + `
        ) ur
        ON ur.rolename = r.rolename`
    }
    let sqlResponse = await sqlConnection.runCommand("EXECUTE_QUERY", [sql]);
    if (sqlResponse.status === "SUCCESS" && sqlResponse.columns && sqlResponse.rows) {
        let roles: { [key: string]: RolesType } = {};
        sqlResponse.rows.forEach(row => {
            if (row.values.length === 4) {
                const role = (row.values[0] + "." + row.values[1]).toLowerCase();
                if (username) {
                    const enabled = String(row.values[2]).toLowerCase() === username.toLowerCase();
                    roles[role] = enabled ? (row.values[3] === 1 ? "grant" : "enabled") : "disabled";
                }
                else {
                    roles[role] = "disabled";
                }
            }
        })
        return Promise.resolve(roles);
    }
    else {
        setError("Unable to retrieve roles: " + sqlResponse.error);
    }
    return Promise.resolve({});
}


export default function SqlRoleSelector({roles, setRoles}: RoleSelectorProps) {
    return <table className="NuoSimpleTable">
        <thead>
            <tr>
                <th>User Roles</th>
                <th>Grant Option</th>
            </tr>
        </thead>
        <tbody>
            {Object.keys(roles).map(roleKey => <tr key={roleKey}>
                <td>
                    <input data-testid={"user-roles-" + roleKey} type="checkbox" name={roleKey} checked={roles[roleKey] !== "disabled"} onChange={() => {
                        let newRoles = {...roles};
                        if (roles[roleKey] === "disabled") {
                            newRoles[roleKey] = "enabled";
                        }
                        else {
                            newRoles[roleKey] = "disabled";
                        }
                        setRoles(newRoles);
                    }} />
                    {roleKey}
                </td>
                <td>
                    <input data-testid={"grant-option-" + roleKey} type="checkbox" name={roleKey} checked={roles[roleKey] === "grant"} onChange={() => {
                        let newRoles = {...roles};
                        if (newRoles[roleKey] === "enabled") {
                            newRoles[roleKey] = "grant";
                        }
                        else {
                            newRoles[roleKey] = "enabled";
                        }
                        setRoles(newRoles);
                    }}
                        disabled={roles[roleKey] === "disabled"}
                    />
                </td>
            </tr>)}
        </tbody>
    </table>
}
