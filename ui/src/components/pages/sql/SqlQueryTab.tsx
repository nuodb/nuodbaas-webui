// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React, { useEffect, useState } from 'react';
import { withTranslation } from "react-i18next";
import { t } from 'i18next';
import { SqlResponse, SqlType } from '../../../utils/SqlSocket';
import TextField from '../../controls/TextField';
import Button from '../../controls/Button';
import SqlResultsRender from './SqlResultsRender';
import Toast from '../../controls/Toast';
import Pagination, { pageFilter } from '../../controls/Pagination';

type SqlQueryTabProps = {
    sqlConnection: SqlType;
    dbTable: string;
}
function SqlQueryTab({ sqlConnection, dbTable }: SqlQueryTabProps) {
    const [results, setResults] = useState<SqlResponse|undefined>(undefined);
    const [sqlQuery, setSqlQuery] = useState("");
    const [executing, setExecuting] = useState(false);
    const [page, setPage] = useState<number>(1);
    const pageSize = 100;

    useEffect(()=>{
        if (dbTable) {
            setSqlQuery("SELECT * FROM `" + dbTable + "` LIMIT 100");
        }
        else {
            setSqlQuery("CREATE TABLE `table1` (`name` VARCHAR(80))");
        }
        setResults(undefined);
    }, [dbTable]);

    let pagedResults = results ? { ...results } : undefined;
    if (pagedResults && pagedResults.rows) {
        pagedResults.rows = [...pageFilter(pagedResults.rows, page, pageSize)];
    }

    return <><form>
        <div className="NuoRow NuoFieldContainer">
            <TextField disabled={!sqlConnection || executing} required data-testid="sqlQuery" id="sqlQuery" label="SQL Query" value={sqlQuery} onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setSqlQuery(event.target.value)} />
            <Button data-testid="submitSql" disabled={!sqlConnection || executing} variant="contained" type="submit" onClick={async () => {
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
                setPage(1);
            }}>{executing ? t("form.sqleditor.button.executing") : t("form.sqleditor.button.submit")}</Button>
        </div>
    </form>
        <SqlResultsRender results={pagedResults} />
        {results?.rows && <Pagination
            count={Math.ceil(results.rows.length / pageSize)}
            page={page}
            setPage={setPage}
        />}
    </>;
}

export default withTranslation()(SqlQueryTab);
