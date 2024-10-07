// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from '@mui/material/Button'
import { CustomType, LOCAL_USER_SETTINGS } from "../../utils/Customizations";
import axios from "axios";

export default function SettingsAdvanced() {
    const navigate = useNavigate();
    let [settings, setSettings] = useState("");
    let [error, setError] = useState("");

    useEffect(() => {
        const lSettings = localStorage.getItem(LOCAL_USER_SETTINGS);
        if (lSettings != null) {
            setSettings(lSettings);
            return;
        }

        axios.get("/ui/customizations.json").then(response => {
            let custom: CustomType = response.data;
            let settings: CustomType = {};
            const views = custom.views;
            if (views) {
                Object.keys(views).forEach(view => {
                    const columns = views[view].columns;
                    if (columns) {
                        if (!settings.views) {
                            settings.views = {};
                        }
                        settings.views[view] = { columns };
                    }
                })
            }
            setSettings(JSON.stringify(settings, null, 2));
        })
    }, []);

    return (
        <React.Fragment>
            <h1>Advanced Settings</h1>
            <div>
                <textarea
                    value={settings}
                    rows={40} cols={80}
                    onChange={({ currentTarget: input }) => {
                        setSettings(input.value);
                    }}>

                </textarea>
            </div>
            <div style={{ color: "red" }}>{error}</div>
            <Button variant="contained" onClick={() => {
                if (settings === "") {
                    localStorage.removeItem(LOCAL_USER_SETTINGS);
                    navigate("/ui");
                }
                try {
                    let jsonSettings = JSON.parse(settings);
                    localStorage.setItem(LOCAL_USER_SETTINGS, JSON.stringify(jsonSettings, null, 2));
                    navigate("/ui");
                }
                catch (ex) {
                    setError("Invalid JSON input: " + ex);
                }
            }}>Save</Button>
            <Button variant="contained" onClick={() => {
                navigate("/ui");
            }}>Cancel</Button>
        </React.Fragment >
    );
}
