// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import TextField from "../controls/TextField";
import { getValue, setValue } from "./utils"
import { FieldBase_display, FieldBase_validate, FieldProps } from "./FieldBase"
import React, { ReactNode, useState } from 'react';
import { matchesPath } from "../../utils/schema";
import Button from "../controls/Button";
import DialogMaterial from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import { Rest } from "../pages/parts/Rest";
import axios from "axios";
import Toast from "../controls/Toast";

export default function FieldPassword(props: FieldProps): ReactNode {
    const [showChangePasswordDialog, setShowChangePasswordDialog] = useState<boolean>(false);
    const [passwords, setPasswords] = useState<{ [field: string]: string }>({});
    const [errors, setErrors] = useState<{ [field: string]: string | undefined }>({});
    const [dialogError, setDialogError] = useState<string>("");
    const { path, prefix, label, values, required, setValues, autoFocus, readonly, parameter, t } = props;

    switch (props.op) {
        case "edit": return edit();
        case "view": return FieldBase_display(props);
        case "validate": return FieldBase_validate(props);
    }

    /**
     * show Field of type String using the values and schema definition
     * @returns
     */
    function edit(): ReactNode {
        if (readonly && matchesPath(path, "/databases/{organization}/{project}/{database}") && window.location.pathname.startsWith("/ui/resource/edit")) {
            return renderChangeDatabasePassword();
        }

        let value = String(getValue(values, prefix) || "");
        let error = (errors && (prefix in errors) && errors[prefix]) || "";
        return <TextField key={prefix} type="password" required={required} id={prefix} label={label} description={parameter.description} value={value} autoFocus={autoFocus} onChange={({ currentTarget: input }) => {
            let v = { ...values };
            setValue(v, prefix, input.value);
            setValues(v);
        }} error={error} onBlur={() => FieldBase_validate(props)} disabled={readonly} />
    }

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

    function renderChangeDatabasePassword() {
        const dbName = path.startsWith("/databases/") ? path.substring("/databases/".length) : path;
        return <>
            <Button
                data-testid="button.changePassword"
                variant="outlined"
                onClick={() => {
                    setShowChangePasswordDialog(true);
                    setPasswords({});
                    setErrors({});
                }}
            >
                Change Password
            </Button>
            <DialogMaterial open={showChangePasswordDialog}>
                <DialogTitle>{t("dialog.databasePassword.changeForDatabase", { database: dbName })}</DialogTitle>
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
                    <Button data-testid="button.cancel" variant="text" onClick={() => {
                        setShowChangePasswordDialog(false);
                    }}>
                        {t("button.cancel")}
                    </Button>
                    <Button data-testid="dialog.button.changePassword" onClick={async () => {
                        let newErrors = validateField(errors, "oldPassword");
                        newErrors = validateField(newErrors, "newPassword1");
                        newErrors = validateField(newErrors, "newPassword2");
                        setErrors(newErrors);
                        if (Object.keys(newErrors).length === 0) {
                            try {
                                await Rest.post(path + "/dbaPassword", { current: passwords["oldPassword"], target: passwords["newPassword1"] });
                                Toast.show(t("dialog.databasePassword.passwordChanged", { database: dbName }), undefined);
                                setShowChangePasswordDialog(false);
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
                    }}>
                        {t("button.changePassword")}
                    </Button>
                </DialogActions>
            </DialogMaterial>
        </>
    }
}