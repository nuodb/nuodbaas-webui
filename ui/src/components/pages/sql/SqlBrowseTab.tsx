// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import { withTranslation } from "react-i18next";
import { SqlResponse, SqlType } from "../../../utils/SqlSocket";
import SqlResultsRender from "./SqlResultsRender";
import Pagination from "../../controls/Pagination";
import { useEffect, useState } from "react";
import { LastPage } from "@mui/icons-material";

type SqlBrowseTabProps = {
    sqlConnection: SqlType;
    table: string;
};

type SqlResponseState = {
    sqlResponse: SqlResponse|undefined;
    page: number;
    lastPage: number;
};

function SqlBrowseTab({sqlConnection, table}: SqlBrowseTabProps) {
    const [state, setState] = useState<SqlResponseState>({sqlResponse: undefined, page:1, lastPage:1});
    const DEFAULT_PAGE_SIZE = 3;

    useEffect(()=> {
        refreshResults(1, 1, table);
    }, [table]);

    async function refreshResults(page: number, lastPage: number, table: string) {
        const sqlQuery = "select * from `" + table + "`";
        const sqlLimitQuery = sqlQuery + " limit " + String(DEFAULT_PAGE_SIZE) + " offset " + String((page-1)*DEFAULT_PAGE_SIZE);
        const sqlResponse = await sqlConnection.runCommand("EXECUTE_QUERY", [sqlLimitQuery]);
        let state = {
            sqlResponse,
            page,
            lastPage
        };
        if(sqlResponse.status === "SUCCESS" && sqlResponse.rows && sqlResponse.rows.length === DEFAULT_PAGE_SIZE) {
            const countResults = await sqlConnection.runCommand("EXECUTE_QUERY", ["SELECT count(*) FROM (" + sqlQuery + ") total"]);
            if(countResults.status === "SUCCESS" && countResults.rows && countResults.rows[0] && countResults.rows[0].values) {
                const totalRows = countResults.rows[0].values[0];
                state.lastPage = Math.ceil(totalRows / DEFAULT_PAGE_SIZE);
            }
        }
        setState(state);
    }

    if(!state.sqlResponse || state.sqlResponse.error) {
        return <SqlResultsRender results={state.sqlResponse} />
    }
    return <>
        <SqlResultsRender results={state.sqlResponse} />
        <Pagination
            count={state.lastPage}
            page={state.page}
            setPage={(page) => {
                refreshResults(page, state.lastPage, table);
            }}
        />
    </>
}

export default withTranslation()(SqlBrowseTab);
