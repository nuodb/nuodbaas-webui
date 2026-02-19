// (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved.

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Table from "./parts/Table";
import { getResourceEvents, getResourceByPath, getFilterField } from "../../utils/schema";
import { Rest } from "./parts/Rest";
import PageLayout from './parts/PageLayout'
import Auth from "../../utils/auth"
import { PageProps, SortColumnDirectionType, TempAny } from "../../utils/types";
import Pagination from "../controls/Pagination";
import { withTranslation } from "react-i18next";
import Search, { parseSearch } from "./parts/Search";
import ResourceHeader from "./parts/ResourceHeader";
import Toast from "../controls/Toast";
import { getValue } from "../fields/utils";

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
    const [search, setSearch] = useState("");
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

        const parsedSearch = parseSearch(search);
        let labelFilter = "";
        if ("label" in parsedSearch) {
            labelFilter = "&labelFilter=" + parsedSearch["label"];
        }
        let name = "";
        if ("name" in parsedSearch) {
            name = parsedSearch["name"];
        }

        let resourcesByPath_ = getResourceByPath(schema, path);
        if (!resourcesByPath_) {
            navigate("/ui/notfound");
            return;
        }
        if ("get" in resourcesByPath_) {
            Rest.get(path + "?listAccessible=true" + labelFilter).then((data: TempAny) => {
                setAllItems(data.items);
                setAbortController(
                    getResourceEvents(schema, path + "?listAccessible=true&expand=true&offset=0&limit=1000000", (data: TempAny) => {
                        if (data.items) {
                            setItemsAndPath({ items: data.items, path });
                            setAllFieldNames(makeFieldnameList("", data.items));
                        }
                        else {
                            setItemsAndPath({ items: [], path });
                        }
                    }, (error: TempAny) => {
                        Auth.handle401Error(error);
                        setItemsAndPath({ items: [], path });
                    })
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
        setSearch("");
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

    function includesValue(entry: any, value: string): boolean {
        const splitEqual = value.split("=");
        if (splitEqual.length === 1) {
            if (typeof entry === "object") {
                const keys = Object.keys(entry);
                for (let i = 0; i < keys.length; i++) {
                    if (includesValue(entry[keys[i]], value)) {
                        return true;
                    }
                }
                return false;
            }
            else {
                return String(entry).toUpperCase().includes(value.toUpperCase());
            }
        }
        else if (splitEqual.length === 2 || splitEqual.length === 3) {
            const splitPeriod = splitEqual[0].split(".");
            for (let i = 0; i < splitPeriod.length; i++) {
                entry = entry[splitPeriod[i]];
                if (!entry) {
                    return false;
                }
            }

            if (splitEqual.length === 2) {
                return String(entry).toUpperCase().includes(splitEqual[1].toUpperCase());
            }
            else if (typeof entry === "object") {
                const key = Object.keys(entry).find(k => k.toUpperCase() === splitEqual[1].trim().toUpperCase());
                if (key && String(entry[key]).toUpperCase().includes(splitEqual[2].trim().toUpperCase())) {
                    return true;
                }
                else {
                    return false;
                }
            }
            return false;
        }
        return false;
    }

    if (itemsAndPath.items) {
        const dataNotDeleted = itemsAndPath.items.filter((d: TempAny) => d.__deleted__ !== true);
        const sorted = (sort.column && sort.direction !== "none") ?
            dataNotDeleted.sort((item1: any, item2: any) => {
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
            }) : dataNotDeleted;

        const searchFiltered = sorted.filter(entry => {
            const searchParts = search.split(" ");
            for (let i = 0; i < searchParts.length; i++) {
                if (searchParts[i] && !includesValue(entry, searchParts[i])) {
                    return false;
                }
            }
            return true;
        });

        const pageData = searchFiltered.filter((s, index) => index >= (page - 1) * pageSize && index < page * pageSize);

        const data = pageData;

        return (
            <PageLayout {...props} >
                <ResourceHeader schema={schema} path={path} type="list" filterValues={getFilterValues()} onAction={() => navigate("/ui/resource/create" + path)} />
                <div className="NuoTableContainer">
                    <div className="NuoTableOptions">
                        <Search fieldNames={allFieldNames} search={search} setSearch={(search: string) => {
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
                        {renderPaging(data ? data.length : 0)}
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