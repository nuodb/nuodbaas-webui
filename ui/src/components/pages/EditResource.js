import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CreateEditEntry from "./parts/CreateEditEntry";
import { getResourceByPath, getResource } from "../../utils/schema";
import Auth from "../../utils/auth";

/**
 * handles all the /resource/edit/* requests to edit a resource
 */
export default function EditResource({ schema }) {
    const path = "/" + useParams()["*"];
    const [ data, setData ] = useState({});

    useEffect(() => {
        let resourceByPath = getResourceByPath(schema, path);
        if("get" in resourceByPath) {
            getResource(path).then((data) => {
                setData(data);
            }).catch((error) => {
                Auth.handle401Error(error);
                setData({});
            });
        }
        else {
            setData({});
        }
    }, [schema, path]);

    if(!schema || !path) {
        return null;
    }

    return (
        <React.Fragment>
            <CreateEditEntry schema={schema} path={path} data={data}/>
        </React.Fragment>
    );
}
