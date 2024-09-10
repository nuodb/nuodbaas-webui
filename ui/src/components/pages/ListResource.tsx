import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Table from "./parts/Table";
import { getResourceEvents, getCreatePath, getResourceByPath } from "../../utils/schema";
import RestSpinner from "./parts/RestSpinner";
import Button from '@mui/material/Button'
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import Path, { parseSearch } from './parts/Path'
import Auth from "../../utils/auth"
import { TempAny } from "../../utils/types";

/**
 * handles all the /resource/list/* requests to list a resource
 */
export default function ListResource({ schema }: TempAny) {
    const navigate = useNavigate();
    const path = "/" + useParams()["*"];
    const pageSize = 20;

    const [items, setItems] = useState([]);
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
            RestSpinner.get(path + "?listAccessible=true" + labelFilter).then((data: TempAny) => {
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
                            setItems(data.items);
                        }
                        else {
                            setItems([]);
                        }
                    }, (error: TempAny) => {
                        Auth.handle401Error(error);
                        setItems([]);
                    })
                );
            }).catch((reason) => {
                RestSpinner.toastError("Unable to get resource in " + path, reason);
            });
        }
        setCreatePath(getCreatePath(schema, path));
    }, [page, path, schema, search]);

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
        if (lastPage <= 1) {
            return null;
        }
        return <Stack spacing={2} style={{ alignItems: "center" }}>
            <Pagination count={lastPage} page={page} onChange={(event, page) => {
                setPage(page);
            }} />
        </Stack>;
    }

    function getFilterValues() {
        let filterValues = new Set();
        allItems.forEach((item: string) => {
            const parts = item.split("/");
            if (parts.length > 1) {
                filterValues.add(parts[0]);
            }
        })
        return [...filterValues];
    }

    return (
        <React.Fragment>
            <Path schema={schema} path={path} filterValues={getFilterValues()} search={search} setSearch={setSearch} setPage={setPage} />
            {createPath && <Button data-testid="list_resource__create_button" variant="outlined" onClick={handleCreate}>Create</Button>}
            {renderPaging()}
            <Table data-testid="list_resource__table" schema={schema} data={items.filter((d: TempAny) => d.__deleted__ !== true)} path={path} />
            {renderPaging()}
        </React.Fragment>
    );
}
