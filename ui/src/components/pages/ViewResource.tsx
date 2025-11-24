// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CreateEditEntry from "./parts/CreateEditEntry";
import { getResourceByPath, getResourceEvents } from "../../utils/schema";
import { Rest } from "./parts/Rest";
import Auth from "../../utils/auth";
import { PageProps, TempAny } from "../../utils/types";
import PageLayout from "./parts/PageLayout";
import { withTranslation } from "react-i18next";
import ResourceHeader from "./parts/ResourceHeader";

/**
 * handles all the /resource/view/* requests to edit a resource
 */
function ViewResource(props: PageProps) {
    const { schema } = props;
    const path = "/" + useParams()["*"];
    const navigate = useNavigate();
    const [data, setData] = useState({});
    const [error, setError] = useState<any>(undefined);

    useEffect(() => {
        let resourceByPath = getResourceByPath(schema, path);
        if ("get" in resourceByPath) {
            getResourceEvents(path, (data: TempAny) => {
                if (data === null) {
                    setError({ response: { status: 404 } })
                    setData({});
                }
                else {
                    setData(data);
                    setError(undefined);
                }
            }, (error: any) => {
                setError(error);
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

    function renderError(): ReactNode {
        let msg = "";
        if (!error?.response?.status) {
            msg = "Unknown error occurred";
        }
        else if (error.response.data?.detail) {
            msg = error.response.data.detail;
        }
        else if (error.response.status === 404) {
            msg = "Not Found";
        }
        else {
            msg = "Error occurred: " + error.response.status;
        }
        return <>
            <ResourceHeader schema={schema} path={path} type="not_found" onAction={() => {
                navigate(-1);
            }} />
            <div className="NuoTableContainer"><div className="NuoFieldContainer"><h3>{msg}</h3></div></div></>;
    }

    return (
        <PageLayout {...props}>
            {error ? renderError() :
                <CreateEditEntry schema={schema} path={path} data={data} readonly={true} />}
        </PageLayout>
    );
}

export default withTranslation()(ViewResource);