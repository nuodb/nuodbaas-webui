// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import React from "react";
import { useParams } from "react-router-dom";
import CreateEditEntry from "./parts/CreateEditEntry";
import { PageProps } from "../../utils/types";
import PageLayout from "./parts/PageLayout";
import { withTranslation } from "react-i18next";

/**
 * handles all the /resource/create/* requests to create a resource
 */
function CreateResource(props: PageProps) {
    const { schema } = props;
    const path = "/" + useParams()["*"];
    if (!schema) {
        return null;
    }

    return (
        <PageLayout {...props} >
            <CreateEditEntry schema={schema} path={path} />
        </PageLayout>
    );
}

export default withTranslation()(CreateResource);