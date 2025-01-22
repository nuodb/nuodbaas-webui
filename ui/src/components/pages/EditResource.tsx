// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CreateEditEntry from "./parts/CreateEditEntry";
import { getResourceByPath } from "../../utils/schema";
import { Rest } from "./parts/Rest";
import Auth from "../../utils/auth";
import { PageProps, TempAny } from "../../utils/types";
import PageLayout from "./parts/PageLayout";
import { withTranslation } from "react-i18next";

/**
 * handles all the /resource/edit/* requests to edit a resource
 */
function EditResource(props: PageProps) {
    const { schema } = props;
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
        <PageLayout {...props}>
            <CreateEditEntry schema={schema} path={path} data={data} />
        </PageLayout >
    );
}

export default withTranslation()(EditResource);