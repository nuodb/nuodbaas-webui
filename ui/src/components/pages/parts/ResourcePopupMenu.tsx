// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import { useNavigate } from "react-router-dom";
import { CustomViewMenu, evaluate, getCustomizationsView } from "../../../utils/Customizations";
import { getResourceByPath, getSchemaPath, hasMonitoredPath, replaceVariables } from "../../../utils/schema";
import { MenuItemProps, TempAny } from "../../../utils/types";
import Menu from "../../controls/Menu";
import Toast from "../../controls/Toast";
import CustomDialog from "../custom/CustomDialog";
import Dialog from "./Dialog";
import { Rest } from "./Rest";
import EditIcon from '@mui/icons-material/Edit';
import PageviewIcon from '@mui/icons-material/Pageview';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import Icon from "./Icon";
import Auth from "../../../utils/auth";

type ResourcePopupMenuProps = {
    row: any;
    schema: any;
    path:string;
    defaultItem?: string;
    t: any;
}

export default function ResourcePopupMenu({row, schema, path, defaultItem, t}:ResourcePopupMenuProps) {
    const navigate = useNavigate();

    async function handleDelete(row: TempAny, deletePath: string) {
        const createPathFirstPart = deletePath?.replace(/^\//, "").split("/")[0];
        row = { ...row, resources_one: t("resource.label." + createPathFirstPart + "_one", createPathFirstPart) };
        if ("yes" === await Dialog.confirm(t("confirm.delete.resource.title", row), t("confirm.delete.resource.body", row), t)) {
            Rest.delete(deletePath)
                .then(() => {
                    if(!row["$ref"]) {
                        navigate("/ui/resource/list/" + deletePath.substring(0, deletePath.lastIndexOf("/")))
                    }
                    else if (!hasMonitoredPath(path)) {
                        window.location.reload();
                    }
                }).catch((error) => {
                    Toast.show("Unable to delete " + deletePath, error);
                });
        }
    }

    const schemaPath = getSchemaPath(schema, path);
    let lastSchemaPathElement = "/" + schemaPath;
    lastSchemaPathElement = lastSchemaPathElement.substring(lastSchemaPathElement.lastIndexOf("/") + 1);

    let editDeletePath: string;
    if(row["$ref"]) {
        if (lastSchemaPathElement.startsWith("{")) {
            editDeletePath = path + "/" + row["$ref"];
        }
        else {
            // special case for /backuppolicies/{organization}/{name}/databases (or similar) where the last element specifies a resource type
            editDeletePath = "/" + lastSchemaPathElement + "/" + row["$ref"];
        }
    }
    else {
        editDeletePath = path;
    }
    const resource = getResourceByPath(schema, editDeletePath);
    const buttons: MenuItemProps[] = [];
    if (resource && ("get" in resource) && row["$ref"] && Auth.hasAccess("GET", editDeletePath, undefined)) {
        buttons.push({
            "data-testid": "view_button",
            id: "view",
            icon: <PageviewIcon/>,
            label: t("button.view"),
            onClick: () => {
                navigate("/ui/resource/view" + editDeletePath);
                return true;
            }
        });
    }
    if (resource && ("put" in resource) && Auth.hasAccess("PUT", editDeletePath, undefined)) {
        buttons.push({
            "data-testid": "edit_button",
            id: "edit",
            icon: <EditIcon />,
            label: t("button.edit"),
            onClick: () => {
                navigate("/ui/resource/edit" + editDeletePath);
                return true;
            }
        });
    }
    if (resource && ("delete" in resource) && Auth.hasAccess("DELETE", editDeletePath, undefined)) {
        buttons.push({
            "data-testid": "delete_button",
            id: "delete",
            icon: <DeleteForeverIcon />,
            label: t("button.delete"),
            onClick: () => {
                handleDelete(row, editDeletePath);
                return true;
            },
        });
    }

    const cv = getCustomizationsView(path)
    if (cv && cv.menu) {
        cv.menu.forEach((menu: CustomViewMenu) => {
            let menuVisible = false;
            try {
                menuVisible = !menu.visible || evaluate(row, menu.visible);
            }
            catch (ex) {
                const msg = "Error in checking visibility of button.";
                Toast.show(msg, String(ex));
                console.error(msg, ex, row);
            }

            if (menuVisible && (!menu.patch || Auth.hasAccess("PATCH", editDeletePath, undefined))) {
                buttons.push({
                    "data-testid": menu.label,
                    id: menu.label,
                    icon: <Icon name={menu.icon} />,
                    label: t(menu.label),
                    onClick: () => {
                        let label = t(menu.label, row);
                        let promiseConfirm: Promise<any>;
                        if (menu.confirm) {
                            let confirm = t(menu.confirm, row);
                            promiseConfirm = Dialog.confirm(label, confirm, t);
                        }
                        else {
                            promiseConfirm = Promise.resolve("yes");
                        }
                        promiseConfirm.then(result => {
                            if (result === "yes") {
                                if (menu.patch) {
                                    Rest.patch(row["$ref"] ? (path + "/" + row["$ref"]) : path, menu.patch)
                                        .catch((error) => {
                                            Toast.show("Unable to update " + path + "/" + row["$ref"], error);
                                        })
                                }
                                else if (menu.link) {
                                    const link = replaceVariables(menu.link, row);
                                    if (!link.startsWith("//") && link.indexOf("://") === -1) {
                                        navigate(link);
                                    }
                                }
                                else if (menu.dialog) {
                                    CustomDialog({ dialog: menu.dialog, path, data: row, t });
                                }
                            }
                        });
                        return true;
                    }
                });
            }
        })
    }
    return <Menu data-testid="resource-popup-menu" popupId={"row_menu_" + row["$ref"]} items={buttons} defaultItem={defaultItem} align="right" />;

}
