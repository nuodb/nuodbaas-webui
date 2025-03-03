// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import { withTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom"
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Select, { SelectOption } from "../../controls/Select"
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material';
import { RestSpinner } from './Rest';
import { getFilterField, getSchemaPath } from "../../../utils/schema";
import { SchemaType } from "../../../utils/types"

type PathProps = {
    schema: SchemaType;
    path: string;
    prefixLabel: string;
    postfixLabel?: string;
    filterValues?: string[];
    org?: string;
    t: any;
}
function Path({ schema, path, prefixLabel, postfixLabel, filterValues, org, t }: PathProps) {
    const navigate = useNavigate();

    const StyledBreadcrumbs = styled(Breadcrumbs)({
        '.MuiBreadcrumbs-ol': {
            flexWrap: 'nowrap'
        }
    });

    function renderFilter() {
        if (filterField && Array.isArray(filterField)) {
            // last path is not a variable but a list of constant paths - provide user an option to select those
            return <Select id="filter" label="" value={"__select__"} onChange={({ target }) => {
                    navigate("/ui/resource/list" + path + "/" + target.value);
                }}>
                <SelectOption value={"__select__"}>{t("control.select.item.select")}</SelectOption>
                {filterField.map((ff: string) => <SelectOption key={ff} value={ff}>{ff}</SelectOption>)}
            </Select>;
        }

        if (!filterValues || filterValues.length === 0 || !filterField) {
            return null;
        }

        return <Select id={filterField} label={t("field.label." + filterField, filterField)} value={""} onChange={({ target }) => {
                navigate("/ui/resource/list" + path + "/" + target.value);
            }}>
            <SelectOption value="">{t("control.select.item.all")}</SelectOption>
            {filterValues && filterValues.map((fv: string) => <SelectOption key={fv} value={fv}>{fv}</SelectOption>)}
        </Select>;
    }

    let filterField = getFilterField(schema, path);

    let pathParts = (path.startsWith("/") ? path.substring(1) : path).split("/");
    const schemaPath = getSchemaPath(schema, path) || "";
    return <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
        <StyledBreadcrumbs data-testid="path_component" separator=">" aria-label="resources" style={{ color: "#b5b9bc", fontSize: "1em", padding: "0 20px", display: "flex", flexWrap: "nowrap" }}>
            {prefixLabel && <Typography key="management" color="text.primary" style={{ fontSize: "1em", textWrap: "nowrap" }}>{prefixLabel}</Typography>}
            {pathParts && pathParts.map((p: string, index: number) => {
                if (index === 0) {
                    p = t("resource.label." + p, p);
                }
                if ((index === pathParts.length - 1 && !postfixLabel) || (org && index === 0)) {
                    return <Typography key={index} color="text.primary" style={{ fontSize: "1em", textWrap: "nowrap" }}>{p}</Typography>
                }
                else if (index === pathParts.length - 2 && schemaPath != null && !schemaPath.endsWith("}")) {
                    let subPath = "/ui/resource/view/" + pathParts.slice(0, index + 1).join("/")
                    return <Link underline="hover" key={index} color="inherit" href="#" style={{ textWrap: "nowrap" }} onClick={() => {
                        navigate(subPath);
                    }
                    }>{p}</Link>;
                }
                else {
                    let subPath = "/ui/resource/list/" + pathParts.slice(0, index + 1).join("/")
                    return <Link underline="hover" key={index} color="inherit" href="#" style={{ textWrap: "nowrap" }} onClick={() => {
                        navigate(subPath);
                    }
                    }>{p}</Link>;
                }
            })}
            {postfixLabel && <Typography key="management" color="text.primary" style={{ fontSize: "1em", textWrap: "nowrap" }}>{postfixLabel}</Typography>}
            {renderFilter()}
        </StyledBreadcrumbs>
        <RestSpinner />
    </div>;
}

export default withTranslation()(Path);
