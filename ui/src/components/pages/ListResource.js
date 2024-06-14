import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Table from "./parts/Table";
import { getResource, getCreatePath, getResourceByPath } from "../../utils/schema";
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

    useEffect(() => {
        if (!schema) {
            return;
        }
        let resourcesByPath_ = getResourceByPath(schema, path);
        if("get" in resourcesByPath_) {
            getResource(path + "?expand=true").then((data) => {
                if(data.items) {
                    setData(data.items);
                }
                else {
                    setData([]);
                }
            }).catch((error) => {
                Auth.handle401Error(error);
                setData([]);
            })
        }
        setCreatePath(getCreatePath(schema, path));
    }, [ path, schema]);

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
