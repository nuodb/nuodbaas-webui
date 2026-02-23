// (C) Copyright 2025-2026 Dassault Systemes SE.  All Rights Reserved.

import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageProps } from "../../../utils/types";
import { getSchemaPath } from "../../../utils/schema";
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import GroupIcon from '@mui/icons-material/Group';
import BackupIcon from '@mui/icons-material/Backup';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import StorageIcon from '@mui/icons-material/Storage';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import BarChartIcon from '@mui/icons-material/BarChart';
import ComboBox from "../../controls/ComboBox";

interface OrganizationProps extends PageProps {
    onSelection?: () => void;
}


function Organization({ schema, org, orgs, setOrg, onSelection, t }: OrganizationProps) {
    const navigate = useNavigate();
    let path = "/" + useParams()["*"];

    function selectOrg(newOrg: string) {
        setOrg(newOrg);
        const schemaPath = getSchemaPath(schema, path + "/") || "";
        const posOrganization = schemaPath.indexOf("/{organization}");
        if (posOrganization !== -1) {
            path = schemaPath.substring(0, posOrganization);
            if (newOrg !== "") {
                path += "/" + newOrg;
            }
            navigate("/ui/resource/list" + path);
        }
    }
    const orgMenuItems = [{
        id: "",
        label: t("field.select.allOrgs"),
        onClick: () => {
            selectOrg("");
            return true;
        }
    }
        , ...orgs.map(o => {
            return {
                id: o,
                label: o,
                onClick: () => {
                    selectOrg(o);
                    return true;
                }
            }
        })];
    return <ComboBox loadItems={() => { return new Promise((resolve) => resolve(orgMenuItems)) }} selected={org}>
        <CorporateFareIcon /><label>{org === "" ? t("field.select.allOrgs") : org}</label>
    </ComboBox>;
}

type MenuDataType = {
    [key: string]: {
            label: string,
            children: {
                [key: string]: {
                    label: string,
                    path: string
                }
            }
        }
    };

type MenuProps = {
    data: MenuDataType;
    org: string;
    onSelection?: () => void;
};

function TOC(props: MenuProps) {
    const { data, org, onSelection } = props;
    const navigate = useNavigate();

    const icons: { [key: string]: React.ReactNode } = {
        "organization": <BarChartIcon />,
        "projects": <AccountTreeIcon />,
        "databases": <StorageIcon />,
        "backups": <BackupIcon />,
        "backuppolicies": <CloudSyncIcon />,
        "users": <GroupIcon />,
    }

    return <>{Object.keys(data).map(key => <div className="details" key={key}>
        <div className="summary">{data[key].label}</div>
        <ol>
            {Object.keys(data[key].children).map(childKey => {
                let icon: React.ReactNode = icons[childKey];
                if (!icon) {
                    icon = <svg style={{ width: "24px", height: "24px" }} className="MuiSvgIcon-root MuiSvgIcon-fontSizeMedium css-1umw9bq-MuiSvgIcon-root" focusable="false" aria-hidden="true" viewBox="0 0 24 24"></svg>
                }
                let path = data[key].children[childKey].path;
                if (path) {
                    if (path.includes("/{organization}")) {
                        path = path.replace("/{organization}", org === "" ? "" : "/" + org);
                    }
                }
                const pathname = window.location.pathname;
                let className = "NuoLeftMenu-" + childKey + " NuoLeftMenuItem";
                if (path === pathname || path + "/" === pathname || (pathname + "/").startsWith(path + "/")) {
                    className += " NuoLeftMenuItemSelected";
                }
                return <li data-testid={"menu-button-" + childKey}
                    key={childKey}
                    className={className}
                    tabIndex={0}
                    onClick={() => {
                        onSelection && onSelection();
                        navigate(path);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            navigate(path);
                        }
                    }}
                >{icon}<label>{data[key].children[childKey].label}</label></li>;
            }
            )}
        </ol>
    </div>)}</>;
}

interface LeftMenuProps extends PageProps {
    className: string;
    onSelection?: () => void;
}

export default function LeftMenu(props: LeftMenuProps) {
    const { schema, className, t } = props;

    if (!schema) {
        return null;
    }
    let resources: string[] = Object.keys(schema).filter(path => !path.includes("{") && schema[path]["get"] && !path.startsWith("/login") && !path.startsWith("/events/")).map(path => {
        while (path.startsWith("/")) {
            path = path.substring(1);
        }
        return path;
    });
    const presetOrder = ["projects", "databases", "backups", "backuppolicies", "users"];
    resources.sort((r1, r2) => {
        let index1 = presetOrder.indexOf(r1);
        if (index1 === -1) {
            index1 = presetOrder.length;
        }
        let index2 = presetOrder.indexOf(r2);
        if (index2 === -1) {
            index2 = presetOrder.length;
        }
        return index1 - index2;
    })

    let childrenManagement: { [key: string]: any } = {};
    let childrenCluster: { [key: string]: any } = {};
    resources.forEach(resource => {
        if (resource.startsWith("cluster/")) {
            childrenCluster[resource] = {
                id: "menu-button-" + resource.replace("/", "-"),
                label: t("resource.label." + resource.replace("/", "."), resource.substring("cluster/".length)),
                path: "/ui/resource/list/" + resource
            };
        }
        else {
            childrenManagement[resource] = {
                id: "menu-button-" + resource,
                label: t("resource.label." + resource, resource),
                path: "/ui/resource/list/" + resource + "/{organization}"
            };
        }
    })

    let data: MenuDataType = {};
    if (Object.keys(childrenManagement).length > 0) {
        data.management = {
            label: "Management",
            children: childrenManagement
        };
    }
    if (Object.keys(childrenCluster).length > 0) {
        data.cluster = {
            label: "Cluster",
            children: childrenCluster
        };
    }
    return <div className={className}>
        <img className="NuoForDesktop" alt="" />
        <Organization {...props} />
        <TOC {...props} data={data} />
    </div>;
}
