
// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import { useState } from "react";
import TextField from "../../controls/TextField";
import Button from "../../controls/Button";
import DialogActions from "@mui/material/DialogActions";
import Toast from "../../controls/Toast";
import { Rest } from "../parts/Rest";
import axios from "axios";
import Dialog from "../parts/Dialog";
import DialogContent from "@mui/material/DialogContent";

type ChangeDbaPasswordProps = {
    path: string;
    data: any;
    t: any;
}

export default function ChangeDbaPassword({path, data, t}: ChangeDbaPasswordProps) {
    const [passwords, setPasswords] = useState<{ [field: string]: string }>({});
    const [errors, setErrors] = useState<{ [field: string]: string | undefined }>({});
    const [dialogError, setDialogError] = useState<string>("");

    function handleChange({ currentTarget }: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        setPasswords({ ...passwords, [currentTarget.name]: currentTarget.value });
    }

    function validateField(errors: { [field: string]: string | undefined }, name: string) {
        if (!passwords[name]) {
            return { ...errors, [name]: t("dialog.databasePassword.fieldRequired") };
        }
        if (name === "newPassword2" && passwords["newPassword1"] !== passwords["newPassword2"]) {
            return { ...errors, [name]: t("dialog.databasePassword.noMatch") }
        }

        let newErrors = { ...errors };
        delete newErrors[name];
        return newErrors;
    }

    function handleBlur({ currentTarget }: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        setErrors(validateField(errors, currentTarget.name));
    }

    async function handleChangePasswordButton(): Promise<boolean> {
        const fullPath = data["$ref"] ? path + "/" + data["$ref"] : path;
        const dbName = fullPath.startsWith("/databases/") ? fullPath.substring("/databases/".length) : fullPath;
        let newErrors = validateField(errors, "oldPassword");
        newErrors = validateField(newErrors, "newPassword1");
        newErrors = validateField(newErrors, "newPassword2");
        setErrors(newErrors);
        if (Object.keys(newErrors).length === 0) {
            try {
                await Rest.post(fullPath + "/dbaPassword", { current: passwords["oldPassword"], target: passwords["newPassword1"] });
                Toast.show(t("dialog.databasePassword.passwordChanged", { database: dbName }), undefined);
                return true;
            }
            catch (error) {
                if (axios.isAxiosError(error)) {
                    setDialogError(t("dialog.databasePassword.cannotChangePassword", { error: error.response?.data?.detail }));
                }
                else {
                    throw error;
                }
            }
        }
        return false;
    }

    return <>
        <DialogContent>
            <div className="NuoFieldContainer">
                <TextField
                    required={true}
                    id="oldPassword"
                    type="password"
                    label={t("dialog.databasePassword.currentPassword")}
                    value={passwords["oldPassword"] || ""}
                    onChange={handleChange}
                    error={errors["oldPassword"]}
                    onBlur={handleBlur}
                />
            </div>
            <div className="NuoFieldContainer">
                <TextField
                    required={true}
                    id="newPassword1"
                    type="password"
                    label={t("dialog.databasePassword.newPassword")}
                    value={passwords["newPassword1"]}
                    onChange={handleChange}
                    error={errors["newPassword1"]}
                    onBlur={handleBlur}
                />
            </div>
            <div className="NuoFieldContainer">
                <TextField required={true}
                    id="newPassword2"
                    type="password"
                    label={t("dialog.databasePassword.reenterPassword")}
                    value={passwords["newPassword2"]}
                    onChange={handleChange}
                    error={errors["newPassword2"]}
                    onBlur={handleBlur}
                />
            </div>
            <div className="NuoError">{dialogError}</div>
        </DialogContent>
        <DialogActions>
            <Button data-testid="button.cancel" onClick={()=>{
                Dialog.close("cancel");
            }}>{t("button.cancel")}</Button>
            <Button data-testid="button.changePassword" onClick={async ()=>{
                if(await handleChangePasswordButton()) {
                    Dialog.close("change");
                }
            }}>{t("button.changePassword")}</Button>
        </DialogActions>
        </>
}
