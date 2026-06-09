// (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Table from "./parts/Table";
import {
  getResourceEvents,
  getResourceByPath,
  getFilterField,
  Feature,
} from "../../utils/schema";
import { Rest } from "./parts/Rest";
import PageLayout from "./parts/PageLayout";
import Auth from "../../utils/auth";
import {
  DataType,
  PageProps,
  SortColumnDirectionType,
  TempAny,
} from "../../utils/types";
import Pagination from "../controls/Pagination";
import { withTranslation } from "react-i18next";
import Search from "./parts/Search";
import ResourceHeader from "./parts/ResourceHeader";
import Toast from "../controls/Toast";
import { getValue } from "../fields/utils";
import { getFieldFilter, SearchType } from "./ListResourceFilter";

type ItemsAndPathProps = {
  items: DataType[] | null;
  path: string;
};

function getCurrentPath() {
  const pathPrefix = "/ui/resource/list/";
  let currentPath = window.location.pathname;
  if (currentPath.startsWith(pathPrefix)) {
    currentPath = "/" + currentPath.substring(pathPrefix.length);
  }
  return currentPath;
}

export function useInterval(callback: () => void, delay: number | null): void {
  // Explicitly type the ref to hold a function matching the callback signature
  const savedCallback = useRef<() => void>(undefined);

  // Remember the latest callback configuration
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval loop
  useEffect(() => {
    // Return early if the delay is null (paused state)
    if (delay === null) return;

    const id = setInterval(() => {
      // Use optional chaining or non-null assertion safely
      savedCallback.current?.();
    }, delay);

    return () => clearInterval(id);
  }, [delay]);
}

/**
 * handles all the /resource/list/* requests to list a resource
 */
function ListResource(props: PageProps) {
  const { schema } = props;
  const path = getCurrentPath();
  const pageSize = 20;

  const [itemsAndPath, setItemsAndPath] = useState<ItemsAndPathProps>({
    items: null,
    path,
  });
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState([]);
  const [allFieldNames, setAllFieldNames] = useState<string[]>([]);
  const [abortController, setAbortController] = useState<TempAny>(null);
  const [search, setSearch] = useState<SearchType[]>([]);
  const [sort, setSort] = useState<SortColumnDirectionType>({
    column: "",
    direction: "none",
  });

  const navigate = useNavigate();

  function getFilteredUrl() {
    let url =
      getCurrentPath() +
      "?listAccessible=true&expand=true&offset=" +
      (page - 1) * pageSize +
      "&limit=" +
      pageSize;
    if (sort.column) {
      url += "&sortBy=" + encodeURIComponent(sort.column);
      url += "&reverse=" + String(sort.direction === "desc");
    }
    search.forEach((s) => {
      url += "&fieldFilter=" + encodeURIComponent(getFieldFilter(s));
    });
    return url;
  }

  useInterval(() => {
    const currentPath = getCurrentPath();
    Rest.get(getFilteredUrl())
      .then(async (data: any) => {
        if (!data.items) {
          setItemsAndPath({ items: [], path: currentPath });
          return;
        }
        if (currentPath !== itemsAndPath.path) {
          setItemsAndPath({ items: data.items, path: currentPath });
          setAllFieldNames(makeFieldnameList("", data.items));
        } else {
          const items = await mergeItems(itemsAndPath.items || [], data.items);
          setItemsAndPath({ items, path: currentPath });
          setAllFieldNames(makeFieldnameList("", items));
        }
      })
      .catch((error) => {
        Auth.handle401Error(error);
        Toast.show("Error retrieving entry", error);
        setItemsAndPath({ items: [], path: currentPath });
      });
  }, 15 * 1000);

  /**
   * merges old item list with the new item list
   * - all origItems before the first match with newItems will be at the beginning of the list
   * - all origItems matching with the new list are skipped since the newList has an update (or are the same)
   * - all origItems after the first match and not matching the newList will be at the end
   * - all origItems not part of the newItems will be checked if they were deleted and then not included in the list
   * Example:
   *    orig: [a, c, e, g, j]
   *    new: [B, C, E, F, H]
   *    returns: [a, B, C, E, F, H, g, j]
   *    "g" is at the end because it is not part of the new list and most likely is a deleted item or sorting brought it
   *    out of the new list. It would go either between "a" and "B" or between "H" and "j". Since we cannot do server side
   *    sorting to determine which one it is, we place it at the bottom of the list.
   * @param origItems
   * @param newItems
   * @returns
   */
  async function mergeItems(origItems: DataType[], newItems: DataType[]) {
    if (origItems.length === 0) {
      return newItems;
    }

    const beforeItems: DataType[] = [];
    const afterItems: DataType[] = [];
    let foundFirst = false;
    for (let i = 0; i < origItems.length; i++) {
      if (newItems.find((ni) => ni["$ref"] === origItems[i]["$ref"])) {
        foundFirst = true;
      } else if (!foundFirst) {
        beforeItems.push(origItems[i]);
      } else {
        afterItems.push(origItems[i]);
      }
    }
    const beforeDeleted = await Promise.allSettled(
      beforeItems.map((bi) => Rest.get(getCurrentPath() + "/" + bi["$ref"])),
    );
    const afterDeleted = await Promise.allSettled(
      afterItems.map((ai) => Rest.get(getCurrentPath() + "/" + ai["$ref"])),
    );

    for (let i = beforeDeleted.length - 1; i >= 0; i--) {
      if (beforeDeleted[i].status === "rejected") {
        beforeItems.splice(i, 1);
      }
    }

    for (let i = afterDeleted.length - 1; i >= 0; i--) {
      if (afterDeleted[i].status === "rejected") {
        afterItems.splice(i, 1);
      }
    }

    return [...beforeItems, ...newItems, ...afterItems];
  }

  function makeFieldnameList(prefix: string, items: any): string[] {
    const list: Set<string> = new Set<string>();

    if (typeof items === "object") {
      if (Array.isArray(items)) {
        if (prefix === "") {
          items.forEach((item) => {
            makeFieldnameList("", item).forEach((value) => list.add(value));
          });
        }
      } else {
        Object.keys(items).forEach((key) => {
          makeFieldnameList(
            (prefix ? prefix + "." : "") + key,
            items[key],
          ).forEach((value) => list.add(value));
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

    const resourcesByPath_ = getResourceByPath(schema, getCurrentPath());
    if (!resourcesByPath_) {
      navigate("/ui/notfound");
      return;
    }
    if ("get" in resourcesByPath_) {
      Rest.get(getCurrentPath() + "?listAccessible=true")
        .then((data: TempAny) => {
          setAllItems(data.items);
          setAbortController(
            getResourceEvents(
              schema,
              getFilteredUrl(),
              (data: TempAny) => {
                if (data.items) {
                  setItemsAndPath({
                    items: data.items,
                    path: getCurrentPath(),
                  });
                  setAllFieldNames(makeFieldnameList("", data.items));
                } else {
                  setItemsAndPath({ items: [], path });
                }
              },
              (error: TempAny) => {
                Auth.handle401Error(error);
                Toast.show("Error retrieving entry", error);
                setItemsAndPath({ items: [], path });
              },
              1000,
            ),
          );
        })
        .catch((reason) => {
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
    };
  }, [abortController]);

  function renderPaging(total: number) {
    const lastPage = Math.ceil(total / pageSize);
    return (
      <Pagination
        count={lastPage}
        page={page}
        setPage={(page) => {
          setPage(page);
        }}
      />
    );
  }

  function getFilterValues(): string[] {
    if (!getFilterField(schema, path)) {
      return [];
    }
    const filterValues = new Set<string>();
    allItems.forEach((item: string) => {
      const parts = item.split("/");
      if (parts.length > 1) {
        filterValues.add(parts[0]);
      }
    });
    return [...filterValues];
  }

  function toString(value: any, toUpper: boolean): string {
    let ret;
    if (!value) {
      ret = "";
    } else if (typeof value === "object") {
      ret = JSON.stringify(value);
    } else {
      ret = String(value);
    }
    if (toUpper) {
      return ret.toUpperCase();
    } else {
      return ret;
    }
  }

  function getAllValues(obj: any): string[] {
    if (obj !== null && typeof obj === "object") {
      return Object.values(obj).flatMap(getAllValues);
    }
    if (obj) {
      return [String(obj)];
    } else {
      return [];
    }
  }

  /* check if value is in the entry
   */
  function includesValue(entry: any, search: SearchType): boolean {
    const entryValueRaw = getValue(entry, search.field);
    const entryValue: string = toString(entryValueRaw, search.ignoreCase);
    const searchValue: string = toString(search.value, search.ignoreCase);
    switch (search.condition) {
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
      case "search": {
        const allValues = getAllValues(entry);
        for (let i = 0; i < allValues.length; i++) {
          if (search.ignoreCase) {
            if (
              allValues[i].toUpperCase().includes(search.value.toUpperCase())
            ) {
              return true;
            }
          }
        }
        return false;
      }
    }
    return false;
  }

  if (itemsAndPath.items) {
    let searchFiltered: any = undefined;
    let data = itemsAndPath.items.filter(
      (d: TempAny) => d.__deleted__ !== true,
    );
    if (!Feature.FILTER_ON_SERVER) {
      const sorted =
        sort.column && sort.direction !== "none"
          ? data.sort((item1: any, item2: any) => {
              const value1 = getValue(item1, sort.column);
              const value2 = getValue(item2, sort.column);
              let asc;
              if (typeof value1 === "number" && typeof value2 === "number") {
                asc = value1 - value2;
              } else if (
                typeof value1 === "object" &&
                typeof value2 === "object"
              ) {
                asc = JSON.stringify(value1).localeCompare(
                  JSON.stringify(value2),
                );
              } else {
                asc = String(value1).localeCompare(String(value2));
              }
              return sort.direction === "asc" ? asc : -asc;
            })
          : data;

      searchFiltered = sorted.filter((entry) => {
        for (let i = 0; i < search.length; i++) {
          if (search[i] && !includesValue(entry, search[i])) {
            return false;
          }
        }
        return true;
      });

      data = searchFiltered.filter(
        (_: any, index: number) =>
          index >= (page - 1) * pageSize && index < page * pageSize,
      );
    }
    return (
      <PageLayout {...props}>
        <ResourceHeader
          schema={schema}
          path={path}
          type="list"
          filterValues={getFilterValues()}
          onAction={() => navigate("/ui/resource/create" + path)}
        />
        <div className="NuoTableContainer">
          <div className="NuoTableOptions">
            <Search
              path={path}
              fieldNames={allFieldNames}
              search={search}
              setSearch={(search: SearchType[]) => {
                setPage(1);
                setSearch(search);
              }}
            />
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
            {renderPaging(
              searchFiltered ? searchFiltered.length : allItems.length,
            )}
          </div>
        </div>
      </PageLayout>
    );
  } else {
    return null;
  }
}

export default withTranslation()(ListResource);
