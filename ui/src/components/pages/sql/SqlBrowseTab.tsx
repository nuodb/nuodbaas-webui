// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import { withTranslation } from "react-i18next";
import { SqlResponse, SqlType } from "../../../utils/SqlSocket";
import SqlResultsRender from "./SqlResultsRender";
import Pagination from "../../controls/Pagination";
import { useEffect, useState } from "react";
import SqlFilter, { filterToWhereClause, getFilterConditionOptions, SqlFilterType } from "./SqlFilter";

type SqlBrowseTabProps = {
    sqlConnection: SqlType;
    table: string;
    t: any;
};

type SqlResponseState = {
    sqlResponse: SqlResponse|undefined;
    page: number;
    lastPage: number;
    filter?: SqlFilterType;
    orderBy?: string;
    isAscending: boolean;
};

function SqlBrowseTab({ sqlConnection, table, t }: SqlBrowseTabProps) {
    const [state, setState] = useState<SqlResponseState>({ sqlResponse: undefined, page: 1, lastPage: 1, filter: {}, orderBy: "", isAscending: true });
    const [showFilterDialog, setShowFilterDialog] = useState<Boolean>(false);
    const DEFAULT_PAGE_SIZE = 100;

    useEffect(()=> {
        const newState = { ...state, page: 1, lastPage: 1, filter: {}, orderBy: "" };
        refreshResults(newState);
    }, [table]);

    async function refreshResults(args: SqlResponseState) {
        const { page, filter, orderBy, isAscending } = args;

        let sqlQuery = "SELECT * FROM `" + table + "`";
        if (filter && state.sqlResponse && state.sqlResponse.columns) {
            sqlQuery += filterToWhereClause(state.sqlResponse.columns, filter);
        }
        if (orderBy) {
            sqlQuery += " ORDER BY `" + orderBy + "` " + (isAscending ? "ASC" : "DESC");
        }
        const sqlQueryWithLimit = sqlQuery + " limit " + String(DEFAULT_PAGE_SIZE) + " offset " + String((page - 1) * DEFAULT_PAGE_SIZE);
        const sqlResponse = await sqlConnection.runCommand("EXECUTE_QUERY", [sqlQueryWithLimit]);
        let newState: SqlResponseState = {
            ...args,
            sqlResponse,
        };
        if(sqlResponse.status === "SUCCESS" && sqlResponse.rows && sqlResponse.rows.length === DEFAULT_PAGE_SIZE) {
            const countResults = await sqlConnection.runCommand("EXECUTE_QUERY", ["SELECT count(*) FROM (" + sqlQuery + ") total"]);
            if(countResults.status === "SUCCESS" && countResults.rows && countResults.rows[0] && countResults.rows[0].values) {
                const totalRows = countResults.rows[0].values[0];
                newState.lastPage = Math.ceil(totalRows / DEFAULT_PAGE_SIZE);
            }
        }
        else if (sqlResponse.rows && sqlResponse.rows.length === 0) {
            newState.lastPage = 1;
        }
        if (sqlResponse.columns && filter !== undefined) {
            let initFilter: SqlFilterType = {};
            sqlResponse.columns.forEach(column => {
                if (column.name in filter) {
                    initFilter[column.name] = { ...filter[column.name] };
                }
                else {
                    initFilter[column.name] = { type: getFilterConditionOptions(column.type)[0].id, value: "" };
                }
            });
            newState.filter = initFilter;
        }
        setState(newState);
    }

    if(!state.sqlResponse || state.sqlResponse.error) {
        return <SqlResultsRender results={state.sqlResponse} setShowFilterDialog={setShowFilterDialog} />
    }
    const isFiltered = state.filter && !!Object.keys(state.filter).find(key => !!(state.filter && state.filter[key].value));
    return <div className="NuoTableScrollWrapper">
        {showFilterDialog && state.filter && <SqlFilter columns={state?.sqlResponse?.columns || []} filter={state.filter} setFilter={(newFilter) => {
            if (newFilter) {
                const newState = { ...state, filter: newFilter, page: 1, lastPage: 1 };
                setState(newState);
                refreshResults(newState);
            }
            setShowFilterDialog(false);
        }} />}
        <SqlResultsRender
            results={state.sqlResponse}
            orderBy={state.orderBy}
            setOrderBy={(orderBy: string) => {
                const newState = { ...state, orderBy, isAscending: true };
                setState(newState);
                refreshResults(newState);
            }}
            isAscending={state.isAscending}
            setIsAscending={(isAscending: boolean) => {
                const newState = { ...state, isAscending };
                setState(newState);
                refreshResults(newState);
            }}
            isFiltered={isFiltered}
            setShowFilterDialog={setShowFilterDialog}
        />
        <Pagination
            count={state.lastPage}
            page={state.page}
            setPage={(page) => {
                refreshResults({ ...state, page });
            }}
        />
    </div>
}

export default withTranslation()(SqlBrowseTab);
