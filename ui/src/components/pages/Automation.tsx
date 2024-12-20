// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import Button from "../controls/Button";
import { withTranslation } from "react-i18next";
import RestSpinner from "./parts/RestSpinner";
import { useState } from "react";
import { RestLogEntry } from "../../utils/types";
import { Tooltip } from "@mui/material";
import Accordion from "../controls/Accordion";
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import Auth from "../../utils/auth";

type AutomationProps = {
    t: any
};

let copiedTimeout: NodeJS.Timeout | undefined = undefined;

function Automation({ t }: AutomationProps) {
    const [isRecording, setIsRecording] = useState(RestSpinner.isRecording());
    const [log, setLog] = useState<RestLogEntry[]>([])
    const [selectedLogEntry, setSelectedLogEntry] = useState(-1);
    const [hideGetRequests, setHideGetRequests] = useState(true);
    const [copiedField, setCopiedField] = useState("");

    const filteredLog = log.map((entry, index) => ({ ...entry, index }))
        .filter(entry => hideGetRequests ? entry.method !== "get" : true);
    const token = Auth.getCredentials()?.token;

    return (
        <div className="NuoContainerSM">
            <h1>Automation</h1>
            <Button disabled={isRecording} variant="contained" onClick={(event) => {
                setLog([]);
                setSelectedLogEntry(-1);
                setIsRecording(true);
                RestSpinner.setIsRecording(true);
            }}>Start Recording</Button>&nbsp;
            <Button disabled={!isRecording} variant="contained" onClick={(event) => {
                setIsRecording(false);
                RestSpinner.setIsRecording(false);
                setLog(RestSpinner.getLog());
                RestSpinner.clearLog();
            }}>Stop Recording</Button>
            <select size={20} onChange={(event) => {
                setSelectedLogEntry(event.currentTarget.selectedIndex);
            }}>
                {filteredLog.map(entry => (
                    <option key={entry.index} value={entry.index}>
                        {entry.timestamp.toLocaleTimeString() + " " + entry.method + " " + entry.url}
                    </option>
                ))}
            </select>
            <label><input type="checkbox" checked={hideGetRequests} onChange={() => setHideGetRequests(!hideGetRequests)} />Hide GET requests</label>
            {selectedLogEntry >= 0 && selectedLogEntry < log.length &&
                <textarea value={JSON.stringify(log[selectedLogEntry], null, 2)} readOnly={true} disabled={true} rows={20} cols={80} />}
            {renderCopyCode(t("dialog.automation.curl"), getCurlCommands(filteredLog))}
        </div >
    );

    function getCurlCommands(log: RestLogEntry[]): string[] {
        let ret: string[] = [];
        ret.push("AUTH_TOKEN=\"" + (token || "") + "\"");
        ret.push("HOST=\"" + window.location.protocol + "//" + window.location.host + "\"");
        ret.push("");
        log.forEach(entry => {
            let curl = "curl -X " + entry.method.toUpperCase() + " -H \"Authorization: Bearer $AUTH_TOKEN\" -H \"Content-Type: application/json\" \"$HOST" + entry.url + "\"";
            if (entry.body) {
                curl += " --data-binary '" + JSON.stringify(entry.body).replaceAll("'", "\\'") + "'";
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
            <textarea disabled={true} className="NuoDbConnectionInfoSample" value={lines.join("\n")}></textarea>
        </Accordion>
    }

}

export default withTranslation()(Automation)