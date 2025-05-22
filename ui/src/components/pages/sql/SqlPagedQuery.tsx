// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React, { useEffect, useState } from 'react';
import { withTranslation } from 'react-i18next';
import { SqlResponse, SqlType } from '../../../utils/SqlSocket';
import Pagination from '../../controls/Pagination';
import SqlResultsRender from './SqlResultsRender';

type SqlQueryProps = {
    pageSize: number;
    sqlConnection: SqlType;
    sqlQuery: string; //note: this must be an SQL query without the "limit" and "offset" clauses - so a "limit x offset x" can be easily appended
};

function SqlPagedQuery({pageSize, sqlConnection, sqlQuery}: SqlQueryProps) {
    const [results, setResults] = useState<SqlResponse | undefined>(undefined);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);

    useEffect(()=> {
        setPage(1);
        setLastPage(1);
        refreshResults(1, 1, sqlQuery);
    }, [sqlQuery]);

    useEffect(()=> {
        refreshResults(page, lastPage, sqlQuery);
    }, [page]);

    async function refreshResults(page: number, lastPage: number, sqlQuery: string) {
        let limitedSql = sqlQuery;
        if (pageSize > 0) {
            limitedSql += " limit " + String(pageSize) + " offset " + String((page-1)*pageSize);
        }
        const results = await sqlConnection.runCommand("EXECUTE_QUERY", [limitedSql]);
        if(results.status === "SUCCESS" && results.rows && results.rows.length === pageSize) {
            const countResults = await sqlConnection.runCommand("EXECUTE_QUERY", ["SELECT count(*) FROM (" + sqlQuery + ") total"]);
            if(countResults.status === "SUCCESS" && countResults.rows && countResults.rows[0] && countResults.rows[0].values) {
                const totalRows = countResults.rows[0].values[0];
                setLastPage(Math.ceil(totalRows / pageSize) + (page-1));
                console.log("lastPage", Math.ceil(totalRows / pageSize) + (page-1));
            }
        }
        else {
            setLastPage(page);
        }
        setResults(results);
    }

    if(!results || results.error) {
        return <SqlResultsRender results={results} />
    }
    else if (results.error) {
        return <div className="NuoSqlError">{results.error.split("\n").map((line, index) => <div key={index}>{line}</div>)}</div>
    }
    return <>
        <SqlResultsRender results={results} />
        <Pagination
            count={lastPage}
            page={page}
            setPage={(page) => {
                setPage(page);
            }}
        />
    </>
}

export default withTranslation()(SqlPagedQuery);
