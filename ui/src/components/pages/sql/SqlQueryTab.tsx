// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React, { useEffect, useState } from 'react';
import { withTranslation } from "react-i18next";
import { t } from 'i18next';
import { SqlResponse, SqlType } from '../../../utils/SqlSocket';
import TextField from '../../controls/TextField';
import Button from '../../controls/Button';
import SqlResultsRender from './SqlResultsRender';
import Toast from '../../controls/Toast';
import { Rest } from '../parts/Rest';

type SqlQueryTabProps = {
    sqlConnection: SqlType;
    dbTable: string;
}
function SqlQueryTab({ sqlConnection, dbTable }: SqlQueryTabProps) {
    const [results, setResults] = useState<SqlResponse|undefined>(undefined);
    const [sqlQuery, setSqlQuery] = useState("");
    const [executing, setExecuting] = useState(false);

    useEffect(()=>{
        if (dbTable) {
            setSqlQuery("SELECT * FROM `" + dbTable + "` LIMIT 100");
        }
        else {
            setSqlQuery("CREATE TABLE `table1` (`name` VARCHAR(80))");
        }
        setResults(undefined);
    }, [dbTable]);

    return <><form>
        <div className="NuoRow NuoFieldContainer">
            <TextField disabled={!sqlConnection || executing} required data-testid="sqlQuery" id="sqlQuery" label="SQL Query" value={sqlQuery} onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setSqlQuery(event.target.value)} />
            <Button data-testid="submitSql" disabled={!sqlConnection || executing} variant="contained" type="submit" onClick={async () => {
                try {
                    Rest.incrementPending();
                    setExecuting(true);
                    const response: SqlResponse = await sqlConnection.runCommand("EXECUTE", [sqlQuery]);
                    if (response.status === "SUCCESS") {
                        let shortQuery = sqlQuery.replaceAll("\n", " ");
                        if (shortQuery.length > 80) {
                            shortQuery = shortQuery.substring(0, 80) + "...";
                        }
                        Toast.show("SUCCESS: " + shortQuery, null);
                    }
                    setResults(response);
                    setExecuting(false);
                }
                finally {
                    Rest.decrementPending();
                    console.log("decrementPrending");
                }
            }}>{executing ? t("form.sqleditor.button.executing") : t("form.sqleditor.button.submit")}</Button>
        </div>
    </form>
    <SqlResultsRender results={results} />
    </>;
}

export default withTranslation()(SqlQueryTab);
