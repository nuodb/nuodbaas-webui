// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import React, { useState } from 'react';
import { TempAny } from '../../../utils/types'
import Accordion from '../../controls/Accordion'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import Tooltip from '@mui/material/Tooltip';
import Textarea from '../../controls/Textarea';

type DbConnectionInfoProps = {
    data: TempAny
    t: TempAny
}

let copiedTimeout: NodeJS.Timeout | undefined = undefined;

export default function DbConnectionInfo({ data, t }: DbConnectionInfoProps) {
    const dbName = data.name;
    const sqlEndpoint = data?.status?.sqlEndpoint;
    const caPem = data?.status?.caPem;
    const port = window.location.port;

    const [copiedField, setCopiedField] = useState("");

    const nuosql = [
        "DB_USER=\"<db username, i.e. 'dba'>\"",
        "DB_PASSWORD=\"<db password>\"",
        "CA_PEM=\"" + caPem + "\"",
        "echo \"select tables\" | bin/nuosql " + dbName + "@" + sqlEndpoint + ":" + port + " \\",
        "--user \"$DB_USER\" \\",
        "--password \"$DB_PASSWORD\" \\",
        "--connection-property trustedCertificates=\"$CA_PEM\""
    ];

    const jdbcJava = [
        "import java.net.URLEncoder;",
        "import java.nio.charset.StandardCharsets;",
        "import java.sql.Connection;",
        "import java.sql.ResultSet;",
        "import java.sql.Statement;",
        "",
        "import com.nuodb.jdbc.DataSource;",
        "",
        "public class HelloDb {",
        "    final static String DB_USERNAME = \"<db username, i.e. 'dba'>\";",
        "    final static String DB_PASSWORD = \"<db password>\";",
        "    final static String JKS_PATH = \"nuodb.jks\";",
        "    final static String JKS_PASSWORD = \"passw0rd\";",
        "    final static String JKS_PATH_URLENCODED =  URLEncoder.encode(JKS_PATH, StandardCharsets.UTF_8.name());",
        "    final static String JKS_PASSWORD_URLENCODED = URLEncoder.encode(JKS_PASSWORD, StandardCharsets.UTF_8.name());",
        "    final static String JDBC_URL = \"jdbc:com.nuodb://" + sqlEndpoint + ":" + port + "/" + dbName + "?trustStorePassword=\" + JKS_PASSWORD_URLENCODED + \"&trustStore=\" + JKS_PATH_URLENCODED;",
        "",
        "    public static void main(String[] args) throws Exception {",
        "        DataSource dataSource = new DataSource();",
        "        dataSource.setUrl(JDBC_URL);",
        "        dataSource.setUser(DB_USERNAME);",
        "        dataSource.setPassword(DB_PASSWORD);",
        "        Connection conn = dataSource.getConnection();",
        "        Statement stmt = conn.createStatement();",
        "        ResultSet rs = stmt.executeQuery(\"show tables\");",
        "        while(rs.next()) {",
        "            System.out.println(rs.getString(1));",
        "        }",
        "        rs.close();",
        "        stmt.close();",
        "        conn.close();",
        "    }",
        "}",
    ];

    const jdbcSh = [
        "echo \"" + caPem + "\" > " + dbName + ".pem",
        "keytool -import -trustcacerts -alias \"" + dbName + "\" -file \"" + dbName + ".pem\" -keystore nuodb.jks -storepass passw0rd -noprompt",
        "javac -cp $(ls jar/nuodb-jdbc-*.jar) HelloDb.java",
        "java -cp .:$(ls jar/nuodb-jdbc-*.jar) HelloDb",
    ];

    const cppSource = [
        "#define DB_USERNAME \"<db username, i.e. 'dba'>\"",
        "#define DB_PASSWORD \"<db password>\"",
        "",
        "#define DB_CONNECTION \"" + dbName + "@" + sqlEndpoint + ":" + port + "\"",
        "#define DB_TRUSTED_CERTIFICATE \"" + caPem.replaceAll("\n", "\\n") + "\"",
        "",
        "#include <stdlib.h>",
        "#include <stdio.h>",
        "",
        "#include <exception>",
        "#include <string>",
        "",
        "#include \"NuoDB.h\"",
        "",
        "namespace NuoDB",
        "{",
        "    class Connection;",
        "}",
        "",
        "int main(int argc, char** argv)",
        "{",
        "    try {",
        "        NuoDB::Connection* connection =",
        "            NuoDB::Connection::create(DB_CONNECTION, DB_USERNAME, DB_PASSWORD,",
        "            1, \"trustedCertificates\", DB_TRUSTED_CERTIFICATE);",
        "",
        "        NuoDB::PreparedStatement* stmt =",
        "            connection->prepareStatement(\"show tables\");",
        "        NuoDB::ResultSet* rs = stmt->executeQuery();",
        "",
        "        while (rs->next()) {",
        "            printf(\"Table: %s\n\", rs->getString(1));",
        "        }",
        "",
        "        rs->close();",
        "        stmt->close();",
        "        connection->close();",
        "        return EXIT_SUCCESS;",
        "",
        "    } catch (NuoDB::SQLException& ex) {",
        "        fprintf(stderr, \"SQL exception: %s\n\", ex.what());",
        "    } catch (std::exception& ex) {",
        "        fprintf(stderr, \"Exception: %s\n\", ex.what());",
        "    } catch (...) {",
        "        fprintf(stderr, \"Exception: unknown\n\");",
        "    }",
        "",
        "    return EXIT_FAILURE;",
        "}",
    ];

    const cppBuild = [
        "#!/bin/sh",
        "die () { echo \"$*\"; exit 1; }",
        "",
        "c++ -I./include -Wall -Werror HelloDB.cpp -o HelloDB \\",
        "-Wl,-rpath,./lib64 -L./lib64 -lNuoRemote \\",
        "|| die \"Failed.\"",
        "",
        "./HelloDB",
    ];

    function renderCopyField(fieldname: string, value: string) {
        return <fieldset key={fieldname}>
            <label htmlFor={fieldname}>{fieldname}</label>
            <Tooltip title={copiedField === fieldname ? t("button.copied") : t("button.copy")}>
                <ContentCopyOutlinedIcon className="NuoCopyButton" onClick={() => {
                    navigator.clipboard.writeText(value).then(() => {
                        setCopiedField(fieldname);
                        if (copiedTimeout) {
                            clearTimeout(copiedTimeout)
                        }
                        copiedTimeout = setTimeout(() => {
                            setCopiedField("");
                        }, 2000);
                    })
                }} />
            </Tooltip>
            {value.includes("\n") ?
                <Textarea name={fieldname} disabled={true} value={value}></Textarea>
                :
                <input name={fieldname} disabled={true} value={value} />
            }
        </fieldset>
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

    function processMarkdownLinks(text: string): React.ReactNode {
        let ret: React.ReactNode[] = [];
        while (text) {
            const posBetween = text.indexOf("](");
            if (posBetween === -1) {
                ret.push(text);
                return ret;
            }
            const posTitle = text.lastIndexOf("[", posBetween);
            const posLink = text.indexOf(")", posBetween);
            if (posTitle === -1 || posLink === -1) {
                ret.push(text);
                return ret;
            }

            if (posTitle > 0) {
                ret.push(text.substring(0, posTitle));
            }
            ret.push(<a key={ret.length} href={text.substring(posBetween + "](".length, posLink)}>{text.substring(posTitle + "[".length, posBetween)}</a>);
            text = text.substring(posLink + ")".length);
        }
        return ret;
    }

    return <div className="NuoDbConnectionInfo">
        {renderCopyField(t("dialog.dbConnectionInfo.label.database"), dbName)}
        {renderCopyField(t("dialog.dbConnectionInfo.label.sqlEndpoint"), sqlEndpoint)}
        {renderCopyField(t("dialog.dbConnectionInfo.label.certificate"), caPem)}
        <Accordion summary={t("dialog.dbConnectionInfo.label.codeSamples")} defaultExpanded={false}>
            <div>{processMarkdownLinks(t("dialog.dbConnectionInfo.label.description"))}</div>
            {renderCopyCode(t("dialog.dbConnectionInfo.label.nuosql"), nuosql)}
            <Accordion summary={t("dialog.dbConnectionInfo.label.jdbc")} defaultExpanded={false}>
                {renderCopyCode("HelloDb.java", jdbcJava)}
                {renderCopyCode("build_run.sh", jdbcSh)}
            </Accordion>
            <Accordion summary={t("dialog.dbConnectionInfo.label.cpp")} defaultExpanded={false}>
                {renderCopyCode("HelloDb.cpp", cppSource)}
                {renderCopyCode("build_run.sh", cppBuild)}
            </Accordion>
        </Accordion>
    </div>
}