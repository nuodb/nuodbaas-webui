// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { TempAny } from "../../../utils/types"
import Dialog from "../parts/Dialog"
import DbConnectionInfo from "./DbConnectionInfo";

type CustomDialogProps = {
    dialog: string,
    data: TempAny,
    t: TempAny,
}
export default function CustomDialog({ dialog, data, t }: CustomDialogProps) {
    if (dialog === "DbConnectionInfo") {
        Dialog.ok(t("dialog.dbConnectionInfo.title", { dbName: data.name }), <DbConnectionInfo data={data} t={t} />, t);
    }
    else {
        Dialog.ok(t("label.invalid.dialog", dialog), data, t);
    }
}