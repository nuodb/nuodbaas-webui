// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import { withTranslation } from "react-i18next";
import Button from "../../controls/Button";
import Path from "./Path";
import { SchemaType } from "../../../utils/types";
import { getCreatePath } from "../../../utils/schema";
import EditIcon from '@mui/icons-material/Edit';

type ResourceHeaderProps = {
    schema: SchemaType;
    path: string;
    type: "list" | "create" | "view" | "edit";
    onAction: () => void;
    filterValues?: string[];
    t: any;
}

function ResourceHeader({ schema, path, type, filterValues, onAction, t }: ResourceHeaderProps) {
    const createPath = getCreatePath(schema, path);
    const createPathFirstPart = createPath?.replace(/^\//, "").split("/")[0];
    const createLabel = t('button.create.resource', { resource: t("resource.label." + createPathFirstPart + "_one", createPathFirstPart) });

    let title;
    let breadcrumbPath = path;
    if (type === "list") {
        title = t("resource.label." + createPathFirstPart, createPathFirstPart);
    }
    else if (type === "create") {
        const resourceOne = { resources_one: t("resource.label." + createPathFirstPart + "_one", createPathFirstPart) };
        title = t("text.createNewForResource", resourceOne);
        breadcrumbPath = path + "/" + t("text.newResource", resourceOne);
    }
    else if (type === "view") {
        const resourceOne = { resources_one: t("resource.label." + (path + "/").split("/")[1] + "_one", createPathFirstPart) };
        title = t("text.viewForResource", resourceOne);
    }
    else if (type === "edit") {
        const resourceOne = { resources_one: t("resource.label." + (path + "/").split("/")[1] + "_one", createPathFirstPart) };
        title = t("text.editForResource", resourceOne);
    }

    return <div className="NuoListResourceHeader">
        <h3>{title}</h3>
        <div>
            <Path schema={schema} path={breadcrumbPath} filterValues={filterValues} />
            {type === "list" && createPath && <div className="Nuo-p20"><Button data-testid={"list_resource__create_button_" + createPathFirstPart} variant="contained" onClick={onAction}>{createLabel}</Button></div>}
            {type === "view" && <div className="Nuo-p20"><Button data-testid={"list_resource__edit_button"} variant="contained" onClick={onAction}><EditIcon />{t("button.edit")}</Button></div>}
            {type === "create" && <div className="Nuo-p20"><Button data-testid={"create_resource__create_button"} variant="contained" onClick={onAction}><EditIcon />{t("button.create")}</Button></div>}
            {type === "edit" && <div className="Nuo-p20"><Button data-testid={"create_resource__create_button"} variant="contained" onClick={onAction}><EditIcon />{t("button.save")}</Button></div>}
        </div>
    </div>

}

export default withTranslation()(ResourceHeader);