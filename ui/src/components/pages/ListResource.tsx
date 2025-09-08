// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Table from "./parts/Table";
import { getResourceEvents, getResourceByPath, getFilterField } from "../../utils/schema";
import { Rest } from "./parts/Rest";
import PageLayout from './parts/PageLayout'
import Auth from "../../utils/auth"
import { PageProps, TempAny } from "../../utils/types";
import Pagination from "../controls/Pagination";
import { withTranslation } from "react-i18next";
import Search, { parseSearch } from "./parts/Search";
import ResourceHeader from "./parts/ResourceHeader";
import Toast from "../controls/Toast";

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
    const [abortController, setAbortController] = useState<TempAny>(null);
    const [search, setSearch] = useState("");

    const navigate = useNavigate();

    useEffect(() => {
        if (!schema) {
            return;
        }

        function lastPartLower(value: string) {
            const lastSlash = value.lastIndexOf("/");
            if (lastSlash !== -1) {
                value = value.substring(lastSlash + 1);
            }
            return value.toLowerCase();
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
        if ("get" in resourcesByPath_) {
            Rest.get(path + "?listAccessible=true" + labelFilter).then((data: TempAny) => {
                let start = 0;
                let end = data.items.length;
                while (data.items.length > start && !lastPartLower(data.items[start]).startsWith(name)) {
                    start++;
                }
                while (end - 1 >= start && !lastPartLower(data.items[end - 1]).startsWith(name)) {
                    end--;
                }
                setAllItems(data.items.slice(start, end));
                setAbortController(
                    getResourceEvents(path + "?listAccessible=true&expand=true&offset=" + String(start + (page - 1) * pageSize) + "&limit=" + Math.min(pageSize, end - start) + labelFilter, (data: TempAny) => {
                        if (data.items) {
                            setItemsAndPath({ items: data.items, path });
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
        return () => {
            if (abortController) {
                abortController.abort();
            }
        }
    }, [abortController]);

    function renderPaging() {
        const lastPage = Math.ceil(allItems.length / pageSize);
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

    if (itemsAndPath.items) {
        const dataNotDeleted = itemsAndPath.items.filter((d: TempAny) => d.__deleted__ !== true);
        return (
            <PageLayout {...props} >
                <ResourceHeader schema={schema} path={path} type="list" filterValues={getFilterValues()} onAction={() => navigate("/ui/resource/create" + path)} />
                <div className="NuoTableContainer">
                    <div className="NuoTableOptions">
                        <Search search={search} setSearch={(search: string) => {
                            setPage(1);
                            setSearch(search);
                        }} />
                    </div>
                    <div className="NuoTableScrollWrapper">
                        <Table
                            data-testid="list_resource__table"
                            {...props}
                            data={dataNotDeleted}
                            path={itemsAndPath.path}
                        />
                        {renderPaging()}
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