// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import { TempAny } from "../../../utils/types"
import Dialog from "../parts/Dialog"
import ChangeDbaPassword from "./ChangeDbaPassword";
import DbConnectionInfo from "./DbConnectionInfo";

type CustomDialogProps = {
    dialog: string,
    path: string,
    data: TempAny,
    t: TempAny,
}
export default function CustomDialog({ dialog, path, data, t }: CustomDialogProps) {
    if (dialog === "DbConnectionInfo") {
        Dialog.ok(t("dialog.dbConnectionInfo.title", { dbName: data.name }), <DbConnectionInfo data={data} t={t} />, t, "xl");
    }
    else if (dialog === "ChangeDbaPassword") {
        const fullPath = data["$ref"] ? path + "/" + data["$ref"] : path;
        const dbName = fullPath.startsWith("/databases/") ? fullPath.substring("/databases/".length) : fullPath;
        Dialog.show(
            t("dialog.databasePassword.changeForDatabase", { database: dbName }),
            <ChangeDbaPassword path={path} data={data} t={t} />,
            [], t)
    }
    else {
        Dialog.ok(t("label.invalid.dialog", dialog), JSON.stringify(data), t);
    }
}