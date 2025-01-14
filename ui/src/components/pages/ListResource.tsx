// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Table from "./parts/Table";
import { getResourceEvents, getCreatePath, getResourceByPath, getFilterField } from "../../utils/schema";
import { Rest } from "./parts/Rest";
import Button from "../controls/Button";
import Path, { parseSearch } from './parts/Path'
import Auth from "../../utils/auth"
import { SchemaType, TempAny } from "../../utils/types";
import Pagination from "../controls/Pagination";
import { withTranslation } from "react-i18next";

/**
 * handles all the /resource/list/* requests to list a resource
 */
function ListResource({ schema, t }: SchemaType) {
    const navigate = useNavigate();
    const path = "/" + useParams()["*"];
    const pageSize = 20;

    const [itemsAndPath, setItemsAndPath] = useState({ items: [], path });
    const [page, setPage] = useState(1);
    const [allItems, setAllItems] = useState([]);
    const [createPath, setCreatePath] = useState<string | null>(null);
    const [abortController, setAbortController] = useState<TempAny>(null);
    const [search, setSearch] = useState("");

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
                Rest.toastError("Unable to get resource in " + path, reason);
            });
        }
        setCreatePath(getCreatePath(schema, path));
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

    function handleCreate() {
        navigate("/ui/resource/create" + path);
    }

    function renderPaging() {
        const lastPage = Math.ceil(allItems.length / pageSize);
        return <Pagination count={lastPage} page={page} setPage={(page) => {
                setPage(page);
        }} />;
    }

    function getFilterValues() {
        if (!getFilterField(schema, path)) {
            return [];
        }
        let filterValues = new Set();
        allItems.forEach((item: string) => {
            const parts = item.split("/");
            if (parts.length > 1) {
                filterValues.add(parts[0]);
            }
        })
        return [...filterValues];
    }

    const createPathFirstPart = createPath?.replace(/^\//, "").split("/")[0];
    const createLabel = t('button.create.resource', { resource: t("resource.label." + createPathFirstPart + "_one", createPathFirstPart) });
    const dataNotDeleted = itemsAndPath.items.filter((d: TempAny) => d.__deleted__ !== true);
    return (
        <React.Fragment>
            <Path schema={schema} path={path} filterValues={getFilterValues()} search={search} setSearch={setSearch} setPage={setPage} />
            {createPath && <Button data-testid="list_resource__create_button" variant="outlined" onClick={handleCreate}>{createLabel}</Button>}
            {renderPaging()}
            <Table
                data-testid="list_resource__table"
                schema={schema}
                data={dataNotDeleted}
                path={itemsAndPath.path}
            />
            {renderPaging()}
        </React.Fragment>
    );
}

export default withTranslation()(ListResource);