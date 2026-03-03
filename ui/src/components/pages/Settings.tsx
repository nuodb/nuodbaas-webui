// (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved.

import { useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { LOCAL_USER_SETTINGS } from "../../utils/Customizations";
import axios from "axios";
import Button from "../controls/Button";
import { withTranslation } from "react-i18next";
import { PageProps } from "../../utils/types";
import PageLayout from "./parts/PageLayout";

function Settings(props: PageProps) {
    const { t } = props;
    const navigate = useNavigate();
    let [settings, setSettings] = useState("");
    let [error, setError] = useState("");

    useEffect(() => {
        const lSettings = localStorage.getItem(LOCAL_USER_SETTINGS);
        if (lSettings != null) {
            setSettings(lSettings);
            return;
        }

        axios.get("/ui/theme/user_template.json").then(response => {
            setSettings(JSON.stringify(response.data, null, 2));
        })
    }, []);

    return (<PageLayout {...props}>
        <div className="NuoTableNoData">
            <h1>{t("form.settings.label.title")}</h1>
            <textarea
                value={settings}
                rows={40} cols={80}
                onChange={({ currentTarget: input }) => {
                    setSettings(input.value);
                }}>

            </textarea>
            <div style={{ color: "red" }}>{error}</div>
            <div className="NuoRow">
                <Button data-testid="button.save" onClick={() => {
                    if (settings === "") {
                        localStorage.removeItem(LOCAL_USER_SETTINGS);
                        window.location.href = "/ui";
                    }
                    try {
                        let jsonSettings = JSON.parse(settings);
                        localStorage.setItem(LOCAL_USER_SETTINGS, JSON.stringify(jsonSettings, null, 2));
                        window.location.href = "/ui";
                    }
                    catch (ex) {
                        setError("Invalid JSON input: " + ex);
                    }
                }}>{t("button.save")}</Button>&nbsp;
                <Button data-testid="button.cancel" onClick={() => {
                    navigate("/ui");
                }}>{t("button.cancel")}</Button>
            </div>
        </div ></PageLayout>
    );
}

export default withTranslation()(Settings)