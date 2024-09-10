import React from "react";
import { useParams } from "react-router-dom";
import CreateEditEntry from "./parts/CreateEditEntry";
import { SchemaType } from "../../utils/types";

interface Props {
    schema: SchemaType
}
/**
 * handles all the /resource/create/* requests to create a resource
 */
export default function CreateResource({ schema }: Props) {
    const path = "/" + useParams()["*"];
    if (!schema) {
        return null;
    }

    return (
        <React.Fragment>
            <CreateEditEntry schema={schema} path={path} />
        </React.Fragment>
    );
}
