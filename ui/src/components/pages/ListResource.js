import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Table from "./parts/Table";
import { getResourceEvents, getCreatePath, getResourceByPath, getResource } from "../../utils/schema";
import Button from '@mui/material/Button'
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import Path from './parts/Path'
import Auth from "../../utils/auth"

/**
 * handles all the /resource/list/* requests to list a resource
 */
export default function ListResource({ schema }) {
    const navigate = useNavigate();
    const path = "/" + useParams()["*"];
    const pageSize = 20;

    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [allItems, setAllItems] = useState([]);
    const [createPath, setCreatePath] = useState(null);
    const [abortController, setAbortController] = useState(null);

    useEffect(() => {
        if (!schema) {
            return;
        }
        let resourcesByPath_ = getResourceByPath(schema, path);
        if("get" in resourcesByPath_) {
            setAbortController(
                getResourceEvents(path + "?listAccessible=true&expand=true&offset=" + String((page-1)*pageSize) + "&limit=" + pageSize, (data) => {
                    if(data.items) {
                        setItems(data.items);
                    }
                    else {
                        setItems([]);
                    }
                }, (error) => {
                    Auth.handle401Error(error);
                    setItems([]);
                })
            );
            getResource(path + "?listAccessible=true").then(data => {
                setAllItems(data.items);
            })
        }
        setCreatePath(getCreatePath(schema, path));
    }, [ page, path, schema]);

    useEffect(() => {
        return () => {
          if(abortController) {
            abortController.abort();
          }
        }
      }, [abortController]);

    function handleCreate() {
        navigate("/ui/resource/create" + path);
    }

    function renderPaging() {
        const lastPage = Math.ceil(allItems.length/pageSize);
        if(lastPage <= 1) {
            return null;
        }
        return <Stack spacing={2} style={{alignItems: "center"}}>
            <Pagination count={lastPage} page={page} onChange={(event, page) => {
                setPage(page);
            }}/>
        </Stack>;
    }

    function getFilterValues() {
        let filterValues = new Set();
        allItems.forEach(item => {
            const parts = item.split("/");
            if(parts.length > 1) {
                filterValues.add(parts[0]);
            }
        })
        return [...filterValues];
    }

    return (
        <React.Fragment>
            <Path schema={schema} path={path} filterValues={getFilterValues()} />
            {createPath && <Button data-testid="list_resource__create_button" variant="outlined" onClick={handleCreate}>Create</Button>}
            {renderPaging()}
            <Table data-testid="list_resource__table" schema={schema} data={items.filter(d=> d.__deleted__ !== true)} path={path} />
            {renderPaging()}
        </React.Fragment>
    );
}
