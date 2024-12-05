// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { LOCAL_USER_SETTINGS } from "../../utils/Customizations";
import axios from "axios";
import FieldSelect from "../fields/FieldSelect";
import Button from "../controls/Button";
import { withTranslation } from "react-i18next";

type SettingsProps = {
    t: any
};

function Settings({ t }: SettingsProps) {
    const navigate = useNavigate();
    let [settings, setSettings] = useState("");
    let [advanced, setAdvanced] = useState(false);
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

    function renderBasic(): ReactNode {
        const jsonSettings = JSON.parse(settings || "{}");
        const theme = (jsonSettings.theme && jsonSettings.theme.type) || "material";
        return FieldSelect({
            path: "",
            errors: {},
            required: false,
            autoFocus: false,
            expand: false,
            hideTitle: false,
            readonly: false,
            updateErrors: () => { },
            values: { theme },
            setValues: (values) => {
                const jsonSettings = JSON.parse(settings || "{}");
                if (!jsonSettings.theme) {
                    jsonSettings.theme = {};
                }
                jsonSettings.theme.type = values.theme;
                setSettings(JSON.stringify(jsonSettings, null, 2));
            },
            prefix: "theme",
            label: t("form.settings.label.theme"),
            parameter: {
                type: "select",
                enum: ["material", "plain"]
            },
            t

        }).show();
    }

    function renderAdvanced(): ReactNode {
        return <div>
            <textarea
                value={settings}
                rows={40} cols={80}
                onChange={({ currentTarget: input }) => {
                    setSettings(input.value);
                }}>

            </textarea>
        </div>
    }

    return (
        <div className="NuoContainerSM">
            <h1>Settings</h1>
            {advanced ? renderAdvanced() : renderBasic()}
            <div style={{ color: "red" }}>{error}</div>
            <Button onClick={() => {
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
            }}>Save</Button>&nbsp;
            <Button onClick={() => {
                navigate("/ui");
            }}>Cancel</Button>
            &nbsp;
            {!advanced &&
                <Button onClick={() => {
                    setAdvanced(true);
                }}>Advanced</Button>
            }
        </div >
    );
}

export default withTranslation()(Settings)