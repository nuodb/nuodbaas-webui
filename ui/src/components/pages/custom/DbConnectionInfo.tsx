// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { useState } from 'react';
import { TempAny } from '../../../utils/types'
import Accordion from '../../controls/Accordion'

type DbConnectionInfoProps = {
    data: TempAny
}

let copiedTimeout: NodeJS.Timeout | undefined = undefined;

export default function DbConnectionInfo({ data }: DbConnectionInfoProps) {
    const dbName = data.name;
    const sqlEndpoint = data?.status?.sqlEndpoint;
    const caPem = data?.status?.caPem;

    const [copiedField, setCopiedField] = useState("");

    const nuosql = [
        "DB_USER=\"<Your Username>\" \\",
        "DB_PASSWORD=\"<Your Password>\" \\",
        "nuosql " + dbName + "@" + sqlEndpoint + ":443 \\",
        "--user \"$DB_USER\" \\",
        "--password \"$DB_PASSWORD\" \\",
        "--connection-property verifyHostname=false \\",
        "--connection-property trustedCertificates=\"" + caPem + "\""
    ];

    const jdbc = [
        "final String DB_USERNAME = \"<Your Username>\";",
        "final String DB_PASSWORD = \"<Your User Password>\";",
        "final String JKS_PATH = \"<Your JKS file path\";",
        "final String JSK_ALIAS = \"<Your JKS alias\";",
        "final String JKS_PASSWORD = \"<Your JKS Password>\";",
        "com.nuodb.jdbc.DataSource dataSource = new com.nuodb.jdbc.DataSource();",
        "dataSource.setUrl(\"jdbc:com.nuodb://" + encodeURIComponent(sqlEndpoint) + ":443/" + encodeURIComponent(dbName) +
        "?verifyHostname=false" +
        "&trustStorePassword=\" + URLEncoder.encode(JKS_PASSWORD, StandardCharsets.UTF_8.name()) + \"" +
        "&trustStore=\" + URLEncoder.encode(JKS_PATH, StandardCharsets.UTF_8.name())",
        ");",
        "dataSource.setUser(DB_USERNAME);",
        "dataSource.setPassword(DB_PASSWORD);",
        "",
        "keytool -import -trustcacerts -alias JKS_ALIAS -file ca.pem -keystore JKS_PATH"
    ];

    const nodejs = [
        "const DB_USERNAME = \"<Your Username\";",
        "const DB_PASSWORD = \"<Your Password\";",
        "const config = {",
        "database: '" + dbName + "@" + sqlEndpoint + ":443'",
        "password: DB_PASSWORD,",
        "user: DB_USERNAME,",
        "trustStore: \"" + caPem + "\",",
        "verifyHostname: 'false',",
        "allowSRPFallback: 'false'",
        "}\";",
        "const driver = new Driver();",
        "const connection = await driver.connect(config);"
    ];

    function renderCopyField(fieldname: string, value: string) {
        return <fieldset key={fieldname}>
            <label htmlFor={fieldname}>{fieldname}</label>
            {value.includes("\n") ?
                <textarea name={fieldname} disabled={true}>{value}</textarea>
                :
                <input name={fieldname} disabled={true} value={value} />
            }
            <button className="NuoCopyButton"
                disabled={copiedField === fieldname}
                onClick={() => {
                    navigator.clipboard.writeText(value).then(() => {
                        setCopiedField(fieldname);
                        if (copiedTimeout) {
                            clearTimeout(copiedTimeout)
                        }
                        copiedTimeout = setTimeout(() => {
                            setCopiedField("");
                        }, 2000);
                    })
                }}
            >
                {copiedField === fieldname ? "Copied!" : "Copy"}
            </button>
        </fieldset>
    }

    function renderCopyCode(summary: string, lines: string[]) {
        return <Accordion summary={summary}>
            <button className="NuoCopyButton"
                disabled={copiedField === summary}
                onClick={() => {
                    navigator.clipboard.writeText(lines.join("\n")).then(() => {
                        setCopiedField(summary);
                        if (copiedTimeout) {
                            clearTimeout(copiedTimeout)
                        }
                        copiedTimeout = setTimeout(() => {
                            setCopiedField("");
                        }, 2000);
                    })
                }}
            >
                {copiedField === summary ? "Copied!" : "Copy"}
            </button>
            <textarea disabled={true} className="NuoDbConnectionInfoSample">
                {lines.join("\n")}
            </textarea>
        </Accordion>
    }

    return <div className="NuoDbConnectionInfo">
        {renderCopyField("Database", dbName)}
        {renderCopyField("SQL Endpoint", sqlEndpoint)}
        {renderCopyField("Certificate", caPem)}
        <Accordion summary="Code Samples" defaultExpanded={true}>
            {renderCopyCode("Command Line (nuosql)", nuosql)}
            {renderCopyCode("JDBC", jdbc)}
            {renderCopyCode("NodeJS", nodejs)}
        </Accordion>
    </div>
}