// (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved.

import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Table from "./parts/Table";
import {
  getResourceEvents,
  getResourceByPath,
  getFilterField,
} from "../../utils/schema";
import { Rest } from "./parts/Rest";
import PageLayout from "./parts/PageLayout";
import Auth from "../../utils/auth";
import {
  DataType,
  PageProps,
  ResourcesType,
  SortColumnDirectionType,
  TempAny,
} from "../../utils/types";
import Pagination from "../controls/Pagination";
import { withTranslation } from "react-i18next";
import Search from "./parts/Search";
import ResourceHeader from "./parts/ResourceHeader";
import Toast from "../controls/Toast";
import {
  getFieldFilter,
  makeFieldFilterUrl,
  parseFieldFilterUrl,
  SearchType,
} from "./ListResourceFilter";
import RefreshIcon from "@mui/icons-material/Refresh";
import Button from "../controls/Button";

type ItemsAndPathProps = {
  items: DataType[] | null;
  path: string;
  itemsTotal: number;
};

/**
 * handles all the /resource/list/* requests to list a resource
 */
function ListResource(props: PageProps) {
  const { schema } = props;
  const [searchParams] = useSearchParams();
  const path = "/" + useParams()["*"];
  const pageSize = 20;

  const [itemsAndPath, setItemsAndPath] = useState<ItemsAndPathProps>({
    items: null,
    path,
    itemsTotal: 0,
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
  const [showReloadButton, setShowReloadButton] = useState<boolean>(false);

  const navigate = useNavigate();

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

  function reloadResource() {
    if (!schema) {
      return;
    }

    const resourcesByPath_ = getResourceByPath(schema, path);
    if (!resourcesByPath_) {
      navigate("/ui/notfound");
      return;
    }
    if ("get" in resourcesByPath_) {
      Rest.get(path + "?listAccessible=true")
        .then((data: TempAny) => {
          setAllItems(data.items);
          setShowReloadButton(false);
          let url =
            path +
            "?listAccessible=true&watchAll=true&expand=true&offset=" +
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
          setAbortController(
            getResourceEvents(
              schema,
              url,
              (data: ResourcesType) => {
                if (data.items) {
                  if (data.items.length > 0 && data.items[0]["$isNew"]) {
                    setShowReloadButton(true);
                  }
                  setItemsAndPath({
                    items: data.items,
                    path,
                    itemsTotal: data.total,
                  });
                  setAllFieldNames(makeFieldnameList("", data.items));
                } else {
                  setItemsAndPath({ items: [], path, itemsTotal: 0 });
                }
              },
              (error: TempAny) => {
                Auth.handle401Error(error);
                Toast.show("Error retrieving entry", error);
                setItemsAndPath({ items: [], path, itemsTotal: 0 });
              },
              () => {
                setShowReloadButton(true);
              },
            ),
          );
        })
        .catch((reason) => {
          Toast.show("Unable to get resource in " + path, reason);
        });
    }
  }

  useEffect(() => {
    reloadResource();
  }, [page, path, schema, search, sort]);

  useEffect(() => {
    setPage(1);
  }, [path, schema, search]);

  useEffect(() => {
    setSearch(parseFieldFilterUrl(searchParams.get("ff")));
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

  if (itemsAndPath.items) {
    const data = [...itemsAndPath.items];
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
            <div className="NuoRow" style={{ gap: "10px" }}>
              <Search
                path={path}
                fieldNames={allFieldNames}
                search={search}
                setSearch={(search: SearchType[]) => {
                  setPage(1);
                  setSearch(search);
                  navigate(
                    window.location.pathname +
                      "?ff=" +
                      encodeURIComponent(makeFieldFilterUrl(search)),
                    { replace: true },
                  );
                }}
              />
              {showReloadButton && (
                <Button
                  data-testid="resource-reload"
                  variant="outlined"
                  onClick={() => {
                    setShowReloadButton(false);
                    reloadResource();
                  }}
                >
                  <RefreshIcon />
                </Button>
              )}
            </div>
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
            {renderPaging(itemsAndPath.itemsTotal)}
          </div>
        </div>
      </PageLayout>
    );
  } else {
    return null;
  }
}

export default withTranslation()(ListResource);
