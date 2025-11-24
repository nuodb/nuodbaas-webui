// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import { withTranslation } from "react-i18next";
import Button from "../../controls/Button";
import Path from "./Path";
import { SchemaType } from "../../../utils/types";
import { getCreatePath, getSchemaPath } from "../../../utils/schema";
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import CreateIcon from '@mui/icons-material/Create';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from "react-router-dom";
import ResourcePopupMenu from "./ResourcePopupMenu";

type ResourceHeaderProps = {
    schema: SchemaType;
    path: string;
    data?: any;
    type: "list" | "create" | "view" | "edit" | "not_found";
    onAction: () => void;
    filterValues?: string[];
    t: any;
}

function ResourceHeader({ schema, path, data, type, filterValues, onAction, t }: ResourceHeaderProps) {
    const navigate = useNavigate();
    const createPath = getCreatePath(schema, path);
    const createPathFirstPart = createPath?.replace(/^\//, "").split("/")[0];
    const createLabel = t('button.create.resource', { resource: t("resource.label." + createPathFirstPart + "_one", createPathFirstPart) });

    let title;
    let postfixLabel = undefined;
    if (type === "list") {
        if (createPathFirstPart) {
            title = t("resource.label." + createPathFirstPart, createPathFirstPart);
        }
        else {
            const schemaPathParts = getSchemaPath(schema, path)?.split("/") || [];
            const lastPart = schemaPathParts[schemaPathParts.length - 1];
            if (lastPart !== "}") {
                title = t("resource.label." + lastPart.toLowerCase());
            }
        }
    }
    else if (type === "create") {
        const resourceOne = { resources_one: t("resource.label." + createPathFirstPart + "_one", createPathFirstPart) };
        title = t("text.createNewForResource", resourceOne);
        postfixLabel = t("text.newResource", resourceOne);
    }
    else if (type === "view" || type === "not_found") {
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
            <Path schema={schema} path={path} prefixLabel={t("list.label.management")} postfixLabel={postfixLabel} filterValues={filterValues} />
            <div className="NuoRow" style={{ justifyContent: "end" }}>
                {(type === "not_found" || type === "view") && <div className="Nuo-p20"><Button data-testid={"create_resource__not_found_button"} variant="text" onClick={() => { navigate(-1) }}><CloseIcon />{t("button.close")}</Button></div>}
                {(type === "create" || type === "edit") && <div className="Nuo-p20"><Button data-testid={"create_resource__not_found_button"} variant="text" onClick={() => { navigate(-1) }}><CloseIcon />{t("button.cancel")}</Button></div>}
                {type === "list" && createPath && <div className="Nuo-p20"><Button data-testid={"list_resource__create_button_" + createPathFirstPart} variant="contained" onClick={onAction}><AddIcon />{createLabel}</Button></div>}
                {type === "create" && <div className="Nuo-p20"><Button data-testid={"create_resource__create_button"} variant="contained" onClick={onAction}><CreateIcon />{t("button.create")}</Button></div>}
                {type === "edit" && <div className="Nuo-p20"><Button data-testid={"create_resource__edit_button"} variant="contained" onClick={onAction}><SaveIcon />{t("button.save")}</Button></div>}
                {type === "view" && <ResourcePopupMenu row={data} schema={schema} path={path} t={t} defaultItem="edit" />}
            </div>
        </div>
    </div>

}

export default withTranslation()(ResourceHeader);