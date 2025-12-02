// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

export function sqlString(value: string): string {
    if (value === null) {
        return "NULL";
    }
    return "'" + (value || "").replace("'", "''") + "'";
}

export function sqlIdentifier(value: string): string {
    if (value === null) {
        return "NULL";
    }
    let parts = (value || "").split(".");
    for(let i=0; i < parts.length; i++) {
        parts[i] = "\"" + parts[i].replace("\"", "\"\"") + "\"";
    }
    return parts.join(".");
}
