import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Table from "./parts/Table";
import { getResourceEvents, getCreatePath, getResourceByPath } from "../../utils/schema";
import Button from '@mui/material/Button'
import Path from './parts/Path'
import Auth from "../../utils/auth"

/**
 * handles all the /resource/list/* requests to list a resource
 */
export default function ListResource({ schema }) {
    const navigate = useNavigate();
    const path = "/" + useParams()["*"];

    const [data, setData] = useState([]);
    const [createPath, setCreatePath] = useState(null);
    const [abortController, setAbortController] = useState(null);

    useEffect(() => {
        if (!schema) {
            return;
        }
        let resourcesByPath_ = getResourceByPath(schema, path);
        if("get" in resourcesByPath_) {
            setAbortController(
                getResourceEvents(path + "?expand=true", (data) => {
                    if(data.items) {
                        setData(data.items);
                    }
                    else {
                        setData([]);
                    }
                }, (error) => {
                    Auth.handle401Error(error);
                    setData([]);
                })
            );
        }
        setCreatePath(getCreatePath(schema, path));
    }, [ path, schema]);

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

    return (
        <React.Fragment>
            <Path schema={schema} path={path} data={data} />
            {createPath && <Button variant="outlined" onClick={handleCreate}>Create</Button>}
            <Table schema={schema} data={data} path={path} />
        </React.Fragment>
    );
}
