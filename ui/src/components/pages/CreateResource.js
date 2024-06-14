import React from "react";
import { useParams } from "react-router-dom";
import CreateEditEntry from "./parts/CreateEditEntry";

/**
 * handles all the /resource/create/* requests to create a resource
 */
export default function CreateResource({ schema }) {
    const path = "/" + useParams()["*"];
    if(!schema) {
        return null;
    }

    return (
        <React.Fragment>
            <CreateEditEntry schema={schema} path={path}/>
        </React.Fragment>
    );
}
