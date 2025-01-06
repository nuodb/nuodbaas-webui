// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CreateEditEntry from "./parts/CreateEditEntry";
import Path from "./parts/Path";
import { getResourceByPath } from "../../utils/schema";
import { Rest } from "./parts/Rest";
import Auth from "../../utils/auth";
import { SchemaType, TempAny } from "../../utils/types";

interface Props {
    schema: SchemaType
}
/**
 * handles all the /resource/view/* requests to edit a resource
 */
export default function ViewResource({ schema }: Props) {
    const path = "/" + useParams()["*"];
    const [data, setData] = useState({});

    useEffect(() => {
        let resourceByPath = getResourceByPath(schema, path);
        if ("get" in resourceByPath) {
            Rest.get(path).then((data: TempAny) => {
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

    if (!schema || !path) {
        return null;
    }

    return (
        <React.Fragment>
            <Path schema={schema} path={path} />
            <CreateEditEntry schema={schema} path={path} data={data} readonly={true} />
        </React.Fragment>
    );
}
