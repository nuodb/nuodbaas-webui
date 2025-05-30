// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import { withTranslation } from "react-i18next";
import { SqlResponse, SqlType } from "../../../utils/SqlSocket";
import SqlResultsRender from "./SqlResultsRender";
import Pagination from "../../controls/Pagination";
import { useEffect, useState } from "react";
import SqlFilter, { filterToWhereClause, SqlFilterType } from "./SqlFilter";
import Button from "../../controls/Button";

type SqlBrowseTabProps = {
    sqlConnection: SqlType;
    table: string;
    t: any;
};

type SqlResponseState = {
    sqlResponse: SqlResponse|undefined;
    page: number;
    lastPage: number;
};

function SqlBrowseTab({ sqlConnection, table, t }: SqlBrowseTabProps) {
    const [state, setState] = useState<SqlResponseState>({sqlResponse: undefined, page:1, lastPage:1});
    const [filter, setFilter] = useState<SqlFilterType>({});
    const [showFilterDialog, setShowFilterDialog] = useState<Boolean>(false);
    const DEFAULT_PAGE_SIZE = 100;

    useEffect(()=> {
        refreshResults(1, 1, table, filter);
    }, [table]);

    async function refreshResults(page: number, lastPage: number, table: string, filter: SqlFilterType) {
        let sqlQuery = "SELECT * FROM `" + table + "`";
        sqlQuery += filterToWhereClause(filter);
        sqlQuery += " limit " + String(DEFAULT_PAGE_SIZE) + " offset " + String((page - 1) * DEFAULT_PAGE_SIZE);
        const sqlResponse = await sqlConnection.runCommand("EXECUTE_QUERY", [sqlQuery]);
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
        if (sqlResponse.columns) {
            let initFilter: SqlFilterType = {};
            sqlResponse.columns.forEach(column => {
                if (column.name in filter) {
                    initFilter[column.name] = { ...filter[column.name] };
                }
                else {
                    initFilter[column.name] = { type: "LIKE_PERCENT", value: "" };
                }
            });
            setFilter(initFilter);
        }
        setState(state);
    }

    if(!state.sqlResponse || state.sqlResponse.error) {
        return <SqlResultsRender results={state.sqlResponse} />
    }
    return <>
        <Button onClick={async () =>
            setShowFilterDialog(true)
        }>Filter</Button>
        {showFilterDialog && <SqlFilter columns={state?.sqlResponse?.columns || []} filter={filter} setFilter={(newFilter) => {
            setFilter(newFilter);
            setShowFilterDialog(false);
            refreshResults(state.page, state.lastPage, table, newFilter);
        }} />}
        <SqlResultsRender results={state.sqlResponse} />
        <Pagination
            count={state.lastPage}
            page={state.page}
            setPage={(page) => {
                refreshResults(page, state.lastPage, table, filter);
            }}
        />
    </>
}

export default withTranslation()(SqlBrowseTab);
