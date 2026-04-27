// (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved.

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Table from "./parts/Table";
import { getResourceEvents, getResourceByPath, getFilterField, Feature } from "../../utils/schema";
import { Rest } from "./parts/Rest";
import PageLayout from './parts/PageLayout'
import Auth from "../../utils/auth"
import { PageProps, SortColumnDirectionType, TempAny } from "../../utils/types";
import Pagination from "../controls/Pagination";
import { withTranslation } from "react-i18next";
import Search from "./parts/Search";
import ResourceHeader from "./parts/ResourceHeader";
import Toast from "../controls/Toast";
import { getValue } from "../fields/utils";
import { getFieldFilter, SearchType } from "./ListResourceFilter";

type ItemsAndPathProps = {
    items: [] | null,
    path: string,
}

/**
 * handles all the /resource/list/* requests to list a resource
 */
function ListResource(props: PageProps) {
    const { schema } = props;
    const path = "/" + useParams()["*"];
    const pageSize = 20;

    const [itemsAndPath, setItemsAndPath] = useState<ItemsAndPathProps>({ items: null, path });
    const [page, setPage] = useState(1);
    const [allItems, setAllItems] = useState([]);
    const [allFieldNames, setAllFieldNames] = useState<string[]>([]);
    const [abortController, setAbortController] = useState<TempAny>(null);
    const [search, setSearch] = useState<SearchType[]>([]);
    const [sort, setSort] = useState<SortColumnDirectionType>({ column: "", direction: "none" });

    const navigate = useNavigate();

    function makeFieldnameList(prefix: string, items: any): string[] {
        let list: Set<string> = new Set<string>();

        if (typeof items === "object") {
            if (Array.isArray(items)) {
                if (prefix === "") {
                    items.forEach(item => {
                        makeFieldnameList("", item).forEach(value => list.add(value));
                    });
                }
            }
            else {
                Object.keys(items).forEach(key => {
                    makeFieldnameList((prefix ? (prefix + ".") : "") + key, items[key]).forEach(value => list.add(value));
                });
            }
        }
        if (prefix && list.size === 0 && prefix !== "$ref") {
            list.add(prefix);
        }
        return [...list];
    }

    useEffect(() => {
        if (!schema) {
            return;
        }

        let resourcesByPath_ = getResourceByPath(schema, path);
        if (!resourcesByPath_) {
            navigate("/ui/notfound");
            return;
        }
        if ("get" in resourcesByPath_) {
            Rest.get(path + "?listAccessible=true").then((data: TempAny) => {
                setAllItems(data.items);
                let url = path + "?listAccessible=true&expand=true&offset=0&limit=1000000";
                if (Feature.FILTER_ON_SERVER) {
                    url = path + "?listAccessible=true&expand=true&offset=" + ((page - 1) * pageSize) + "&limit=" + pageSize;
                    if (sort.column) {
                        url += "&sortBy=" + encodeURIComponent(sort.column);
                        url += "&reverse=" + String(sort.direction === "desc");
                    }
                    search.forEach(s => {
                        url += "&fieldFilter=" + encodeURIComponent(getFieldFilter(s));
                    })
                }
                setAbortController(
                    getResourceEvents(schema, url, (data: TempAny) => {
                        if (data.items) {
                            setItemsAndPath({ items: data.items, path });
                            setAllFieldNames(makeFieldnameList("", data.items));
                        }
                        else {
                            setItemsAndPath({ items: [], path });
                        }
                    }, (error: TempAny) => {
                        Auth.handle401Error(error);
                        Toast.show("Error retrieving entry", error);
                        setItemsAndPath({ items: [], path });
                    }, 1000)
                );
            }).catch((reason) => {
                Toast.show("Unable to get resource in " + path, reason);
            });
        }
    }, [page, path, schema, search]);

    useEffect(() => {
        setPage(1);
    }, [path, schema, search]);

    useEffect(() => {
        setSearch([]);
    }, [path, schema]);

    useEffect(() => {
        return () => {
            if (abortController) {
                abortController.abort();
            }
        }
    }, [abortController]);

    function renderPaging(total: number) {
        const lastPage = Math.ceil(total / pageSize);
        return <Pagination count={lastPage} page={page} setPage={(page) => {
                setPage(page);
        }} />;
    }

    function getFilterValues(): string[] {
        if (!getFilterField(schema, path)) {
            return [];
        }
        let filterValues = new Set<string>();
        allItems.forEach((item: string) => {
            const parts = item.split("/");
            if (parts.length > 1) {
                filterValues.add(parts[0]);
            }
        })
        return [...filterValues];
    }

    /* compares both values. value2 can have asterisks ("*") at the beginning, end or both as wildcards.
       - "value1" or "value2" can be string, null or undefined values
       - if "value1" or "value2" are objects or arrays, they are converted to JSON text and then used for comparison
       - the match is case-insensitive
    */
    function isMatch(value1: any, value2: any) {
        if (value1 === null && value2 === null || value1 === undefined && value2 === undefined) {
            return true;
        }
        if (value1 === null || value2 === null || value1 === undefined || value2 === undefined) {
            return false;
        }

        if (typeof value1 === "object") {
            value1 = JSON.stringify(value1);
        }
        if (typeof value2 === "object") {
            value2 = JSON.stringify(value2);
        }

        value1 = String(value1).trim().toUpperCase();
        value2 = String(value2).trim().toUpperCase();

        if (value2 === "*") {
            return true;
        }
        else if (value2.startsWith("*")) {
            if (value2.endsWith("*")) {
                return value1.includes(value2.substring(1, value2.length - 1));
            }
            else {
                return value1.endsWith(value2.substring(1));
            }
        }
        else if (value2.endsWith("*")) {
            return value1.startsWith(value2.substring(0, value2.length - 1));
        }
        else {
            return value1 === value2;
        }
    }

    function toString(value: any, toUpper: boolean): string {
        let ret;
        if(!value) {
            ret = "";
        }
        else if(typeof value === "object") {
            ret = JSON.stringify(value);
        }
        else {
            ret = String(value);
        }
        if(toUpper) {
            return ret.toUpperCase();
        }
        else {
            return ret;
        }
    }

    function getAllValues(obj:any): string[] {
        if (obj !== null && typeof obj === 'object') {
            return Object.values(obj).flatMap(getAllValues);
        }
        if(obj) {
            return [String(obj)];
        }
        else {
            return [];
        }
    };


    /* check if value is in the entry
    */
    function includesValue(entry: any, search: SearchType): boolean {
        const entryValueRaw = getValue(entry, search.field);
        const entryValue: string = toString(entryValueRaw, search.ignoreCase);
        const searchValue: string = toString(search.value, search.ignoreCase);
        switch(search.condition) {
            case "!=":
                return entryValue !== searchValue;
            case "<=":
                return entryValue <= searchValue;
            case "=":
                return entryValue === searchValue;
            case ">=":
                return entryValue >= searchValue;
            case "contains":
                return entryValue.includes(searchValue);
            case "startsWith":
                return entryValue.startsWith(searchValue);
            case "endsWith":
                return entryValue.endsWith(searchValue);
            case "exists":
                return !!entryValueRaw;
            case "notExists":
                return !entryValueRaw;
            case "search":
                const allValues = getAllValues(entry);
                for(let i=0; i<allValues.length; i++) {
                    if(search.ignoreCase) {
                        if(allValues[i].toUpperCase().includes(search.value.toUpperCase())) {
                            return true;
                        }
                    }
                };
                return false;
        }
        return false;
    }

    if (itemsAndPath.items) {
        let searchFiltered: any = undefined;
        let data = itemsAndPath.items.filter((d: TempAny) => d.__deleted__ !== true);
        if (!Feature.FILTER_ON_SERVER) {
            const sorted = (sort.column && sort.direction !== "none") ?
                data.sort((item1: any, item2: any) => {
                    const value1 = getValue(item1, sort.column);
                    const value2 = getValue(item2, sort.column);
                    let asc;
                    if (typeof value1 === "number" && typeof value2 === "number") {
                        asc = value1 - value2;
                    }
                    else if (typeof value1 === "object" && typeof value2 === "object") {
                        asc = JSON.stringify(value1).localeCompare(JSON.stringify(value2));
                    }
                    else {
                        asc = String(value1).localeCompare(String(value2));
                    }
                    return sort.direction === "asc" ? asc : -asc;
                }) : data;

            searchFiltered = sorted.filter(entry => {
                for (let i = 0; i < search.length; i++) {
                    if (search[i] && !includesValue(entry, search[i])) {
                        return false;
                    }
                }
                return true;
            });

            data = searchFiltered.filter((_: any, index: number) => index >= (page - 1) * pageSize && index < page * pageSize);
        }
        return (
            <PageLayout {...props} >
                <ResourceHeader schema={schema} path={path} type="list" filterValues={getFilterValues()} onAction={() => navigate("/ui/resource/create" + path)} />
                <div className="NuoTableContainer">
                    <div className="NuoTableOptions">
                        <Search path={path} fieldNames={allFieldNames} search={search} setSearch={(search: SearchType[]) => {
                            setPage(1);
                            setSearch(search);
                        }} />
                    </div>
                    <div className="NuoColumn NuoTableScrollWrapper">
                        <Table
                            data-testid="list_resource__table"
                            {...props}
                            data={data}
                            path={itemsAndPath.path}
                            sort={sort}
                            setSort={setSort}
                        />
                        {renderPaging(searchFiltered ? searchFiltered.length : allItems.length)}
                    </div>
                </div>
            </PageLayout>
        );
    }
    else {
        return null;
    }
}

export default withTranslation()(ListResource);