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

function Organization({ schema, org, orgs, setOrg, t }: PageProps) {
    const navigate = useNavigate();
    let path = "/" + useParams()["*"];
    return <div className="NuoOrgSelector">
        <CorporateFareIcon />
        <select id={"organization"} value={org} onChange={(e: any) => {
            setOrg(e.target.value);
            const schemaPath = getSchemaPath(schema, path + "/") || "";
            const posOrganization = schemaPath.indexOf("/{organization}");
            if (posOrganization !== -1) {
                path = schemaPath.substring(0, posOrganization);
                if (e.target.value !== "") {
                    path += "/" + e.target.value;
                }
                navigate("/ui/resource/list" + path);
            }
        }}>
            <option value="">{t("field.select.allOrgs")}</option>
            {orgs.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
    </div>;
}

type MenuProps = {
    data: {
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
    org: string;
};

function Menu(props: MenuProps) {
    const { data, org } = props;
    const navigate = useNavigate();

    const icons: { [key: string]: React.ReactNode } = {
        "organization": <BarChartIcon />,
        "projects": <AccountTreeIcon />,
        "databases": <StorageIcon />,
        "backups": <BackupIcon />,
        "backuppolicies": <CloudSyncIcon />,
        "users": <GroupIcon />,
    }

    return <>{Object.keys(data).map(key => <details key={key} open={true}>
        <summary>{data[key].label}</summary>
        <ol>
            {Object.keys(data[key].children).map(childKey => {
                let icon: React.ReactNode = icons[childKey];
                if (!icon) {
                    icon = <svg className="MuiSvgIcon-root MuiSvgIcon-fontSizeMedium css-1umw9bq-MuiSvgIcon-root" focusable="false" aria-hidden="true" viewBox="0 0 24 24"></svg>
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
                return <li data-testid={"menu-button-" + childKey} key={childKey}
                    className={className}
                    onClick={() => {
                        navigate(path);
                    }}
                >{icon}<label>{data[key].children[childKey].label}</label></li>;
            }
            )}
        </ol>
    </details>)}</>;
}

interface LeftMenuProps extends PageProps {
    style?: React.CSSProperties;
}

export default function LeftMenu(props: LeftMenuProps) {
    const { schema, style, org, t } = props;

    if (!schema) {
        return null;
    }
    let resources: string[] = Object.keys(schema).filter(path => !path.includes("{") && schema[path]["get"] && ("x-ui" in schema[path]["get"])).map(path => {
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

    let children: { [key: string]: any } = {};
    resources.forEach(resource => {
        children[resource] = {
            id: "menu-button-" + resource,
            label: t("resource.label." + resource, resource),
            path: "/ui/resource/list/" + resource + "/{organization}"
        };
    })

    const data = {
        "overview": {
            label: "Overview",
            children: {
                "organization": {
                    label: "Organization",
                    path: "/ui/page/organization",
                }
            }
        },
        "management": {
            label: "Management",
            children
        }
    }
    return <div className="NuoLeftMenu" style={style}>
        <Organization {...props} />
        <Menu data={data} org={org} />
    </div>;
}
