// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import { withTranslation } from "react-i18next";
import Button from "../../controls/Button";
import Path from "./Path";
import { SchemaType } from "../../../utils/types";
import { getCreatePath } from "../../../utils/schema";
import { useNavigate } from "react-router-dom";

type ResourceHeaderProps = {
    schema: SchemaType;
    path: string;
    type: "list" | "create";
    filterValues?: string[];
    t: any;
}

function ResourceHeader({ schema, path, type, filterValues, t }: ResourceHeaderProps) {
    const createPath = getCreatePath(schema, path);
    const createPathFirstPart = createPath?.replace(/^\//, "").split("/")[0];
    const createLabel = t('button.create.resource', { resource: t("resource.label." + createPathFirstPart + "_one", createPathFirstPart) });
    const navigate = useNavigate();

    let title;
    let breadcrumbPath = path;
    if (type === "list") {
        title = t("resource.label." + createPathFirstPart, createPathFirstPart);
    }
    else if (type === "create") {
        const data = { resources_one: t("resource.label." + createPathFirstPart + "_one", createPathFirstPart) };
        title = t("text.createNewForResource", data);
        breadcrumbPath = path + "/" + t("text.newResource", data);
    }

    function handleCreate() {
        navigate("/ui/resource/create" + path);
    }

    return <div className="NuoListResourceHeader">
        <h3>{title}</h3>
        <div>
            <Path schema={schema} path={breadcrumbPath} filterValues={filterValues} />
            {type === "list" && createPath && <div className="Nuo-p20"><Button data-testid={"list_resource__create_button_" + createPathFirstPart} variant="contained" onClick={handleCreate}>{createLabel}</Button></div>}
        </div>
    </div>

}

export default withTranslation()(ResourceHeader);