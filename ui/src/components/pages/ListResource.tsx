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
import Search from "./parts/Search";
import ResourceHeader from "./parts/ResourceHeader";
import Toast from "../controls/Toast";

/**
 * Convert a user‑provided search expression into a back‑end‑compatible
 * case‑insensitive regular‑expression string.
 *
 * The UI lets users type filter clauses separated by commas and asterisks, e.g.
 *   "name=aDMI*"
 *
 * The back‑end expects:
 *   • “=” to be a case‑insensitive regex match (prefixed with `~(?i)`).
 *   • `*` wildcards to behave like `.*` in regular expressions.
 *
 * @param search  Raw search string entered by the user.
 * @returns       A string ready to be URL‑encoded and sent as `fieldFilter`.
 */
function rewriteCaseInsensitiveWithWildcards(search: string): string {
    // Split the overall filter into individual clauses (comma‑separated)
    let parts = search.split(",");

    // Process each clause independently
    for (let p = 0; p < parts.length; p++) {
        // Locate the first "=" character – this marks a simple equality filter
        const posEquals = parts[p].indexOf("=");

        // If we have an "=" that is **not** part of a comparison operator
        // (<=, >=, !=) we replace it with a case‑insensitive regex marker.
        // Example: "name=Admin" → "name~(?i)Admin"
        if (
            posEquals > 0 &&                     // there is something before "="
            parts[p][posEquals - 1] !== "<" &&   // not a "<=" style operator
            parts[p][posEquals - 1] !== ">" &&   // not a ">=" style operator
            parts[p][posEquals - 1] !== "!"      // not a "!=" style operator
        ) {
            parts[p] =
                parts[p].substring(0, posEquals) + // left side (field name)
                "~(?i)" +                           // case‑insensitive regex flag
                parts[p].substring(posEquals + 1); // right side (value)
        }

        // Replace any user‑friendly wildcard '*' with the regex equivalent '.*'
        // This allows patterns like "Adm*" to match "Admin", etc.
        parts[p] = parts[p].split("*").join(".*");
    }

    // Re‑assemble the transformed clauses into a single comma‑separated string
    return parts.join(",");
}

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

        let resourcesByPath_ = getResourceByPath(schema, path);
        if (!resourcesByPath_) {
            navigate("/ui/notfound");
            return;
        }
        if ("get" in resourcesByPath_) {
            Rest.get(path + "?listAccessible=true").then((data: TempAny) => {
                setAllItems(data.items);
                let url = path + "?listAccessible=true&expand=true&offset=" + ((page - 1) * pageSize) + "&limit=" + pageSize;
                if (sort.column) {
                    url += "&sortBy=" + encodeURIComponent(sort.column);
                    url += "&reverse=" + String(sort.direction === "desc");
                }
                url += "&fieldFilter=" + encodeURIComponent(rewriteCaseInsensitiveWithWildcards(search));
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

    if (itemsAndPath.items) {
        const data = itemsAndPath.items.filter((d: TempAny) => d.__deleted__ !== true);

        return (
            <PageLayout {...props} >
                <ResourceHeader schema={schema} path={path} type="list" filterValues={getFilterValues()} onAction={() => navigate("/ui/resource/create" + path)} />
                <div className="NuoTableContainer">
                    <div className="NuoTableOptions">
                        <Search path={path} fieldNames={allFieldNames} search={search} setSearch={(search: string) => {
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
                        {renderPaging(allItems.length)}
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