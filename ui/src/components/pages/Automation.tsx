// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import Button from "../controls/Button";
import { withTranslation } from "react-i18next";
import { Rest } from "./parts/Rest";
import { useEffect, useState } from "react";
import { JsonType, RestLogEntry } from "../../utils/types";
import { Tooltip } from "@mui/material";
import Accordion from "../controls/Accordion";
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import Auth from "../../utils/auth";

type AutomationProps = {
    isRecording: boolean,
    t: any
};

let copiedTimeout: NodeJS.Timeout | undefined = undefined;

function Automation({ isRecording, t }: AutomationProps) {
    const [log, setLog] = useState<RestLogEntry[]>([]);
    const [selectedTimestamp, setSelectedTimestamp] = useState(""); //using the timestamp (millisecond granularity) as unique key
    const [hideGetRequests, setHideGetRequests] = useState(true);
    const [convertUpdateToPatch, setConvertUpdateToPatch] = useState(false);
    const [copiedField, setCopiedField] = useState("");

    useEffect(() => {
        const initialLog = Rest.getLog();
        setLog(initialLog);
        setSelectedTimestamp(initialLog.length > 0 ? initialLog[0].timestamp : "");
    }, []);

    const filteredLog = log.filter(entry => hideGetRequests ? entry.method !== "get" : true);
    const token = Auth.getCredentials()?.token;

    let selectedLogEntry = filteredLog.find(fl => fl.timestamp === selectedTimestamp);
    if (!selectedLogEntry && filteredLog.length > 0) {
        selectedLogEntry = filteredLog[0];
    }

    return (
        <div className="NuoContainerLG">
            <h1>{t("dialog.automation.title")}</h1>
            <div className="NuoButtons">
                <Button disabled={isRecording} variant="contained" onClick={(event) => {
                    Rest.clearLog();
                    Rest.setIsRecording(true);
                }}>{t("dialog.automation.startRecording")}</Button>
            <Button disabled={!isRecording} variant="contained" onClick={(event) => {
                    Rest.setIsRecording(false);
                    const log = Rest.getLog();
                    setLog(log);
                    if (log.length > 0 && selectedTimestamp === "") {
                        setSelectedTimestamp(log[0].timestamp);
                    }
                }}>{t("dialog.automation.stopRecording")}</Button>
            </div>
            {!isRecording && log.length > 0 &&
                <div className="NuoColumn">
                    <label>
                        <input type="checkbox" checked={hideGetRequests} onChange={() => {
                            setHideGetRequests(!hideGetRequests);
                        }} />
                        {t("dialog.automation.hideGetRequests")}
                    </label>
                    {filteredLog.length > 0 ?
                        <div className="NuoRow">
                            <select disabled={filteredLog.length === 0} size={20} value={selectedTimestamp} onChange={(event) => {
                                setSelectedTimestamp(event.currentTarget.value);
                            }}>
                                {filteredLog.map(entry => (
                                    <option key={entry.timestamp} value={entry.timestamp}>
                                        {(new Date(entry.timestamp)).toLocaleTimeString() + " " + entry.method + " " + entry.url}
                                    </option>
                                ))}
                            </select>
                            {selectedLogEntry &&
                                <textarea value={JSON.stringify(selectedLogEntry, null, 2)} readOnly={true} disabled={true} rows={20} cols={80} />}
                        </div> : t("dialog.automation.noWriteRequests")}
                </div>}

            {filteredLog.length > 0 && !isRecording && renderCopyCode(t("dialog.automation.curl"), getCurlCommands(filteredLog))}
        </div >
    );

    function getCurlCommands(log: RestLogEntry[]): string[] {
        let ret: string[] = [];
        ret.push("AUTH_TOKEN=\"" + (token || "") + "\"");
        ret.push("HOST=\"" + window.location.protocol + "//" + window.location.host + "\"");
        ret.push("");
        log.forEach(entry => {
            let method = entry.method.toUpperCase();
            let body: any = entry.body;
            if (method === "PUT" && body && body["resourceVersion"] && convertUpdateToPatch) {
                let patch: JsonType[] = [];
                Object.keys(body).forEach(key => {
                    if (key !== "resourceVersion") {
                        patch.push({ op: "add", path: "/" + key, value: body[key] });
                    }
                })
                body = patch;
                method = "PATCH";
            }
            const contentType = method === "PATCH" ? "application/json-patch+json" : "application/json";
            let curl = "curl -X " + method + " -H \"Authorization: Bearer $AUTH_TOKEN\" -H \"Content-Type: " + contentType + "\" \"$HOST" + entry.url + "\"";
            if (body) {
                curl += " --data-binary '" + JSON.stringify(body).replaceAll("'", "\\'") + "'";
            }
            ret.push(curl);
        })
        return ret;
    }


    function renderCopyCode(summary: string, lines: string[]) {
        return <Accordion summary={summary}>
            <Tooltip title={copiedField === summary ? t("button.copied") : t("button.copy")}>
                <ContentCopyOutlinedIcon className="NuoCopyButton" onClick={() => {
                    navigator.clipboard.writeText(lines.join("\n")).then(() => {
                        setCopiedField(summary);
                        if (copiedTimeout) {
                            clearTimeout(copiedTimeout)
                        }
                        copiedTimeout = setTimeout(() => {
                            setCopiedField("");
                        }, 2000);
                    })
                }} />
            </Tooltip>
            <label>
                <input type="checkbox" checked={convertUpdateToPatch} onChange={() => {
                    setConvertUpdateToPatch(!convertUpdateToPatch);
                }} />
                {t("dialog.automation.convertUpdatesToPatchRequests")}
            </label>

            <textarea disabled={true} className="NuoDbConnectionInfoSample" value={lines.join("\n")}></textarea>
        </Accordion>
    }

}

export default withTranslation()(Automation)