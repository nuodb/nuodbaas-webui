// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import React, { useState } from "react"
import { withTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom"
import Button from "../../controls/Button"
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Select, { SelectOption } from "../../controls/Select"
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography';
import TextField from "../../controls/TextField"
import { styled } from '@mui/material';
import { RestSpinner } from './Rest';
import { getFilterField, getSchemaPath } from "../../../utils/schema";
import { TempAny } from "../../../utils/types"

export function parseSearch(search: string) {
    search = search.trim();
    let ret: TempAny = {};

    search.split(" ").forEach((parts: string) => {
        const posEqual = parts.indexOf("=");
        if (posEqual !== -1) {
            const key = parts.substring(0, posEqual);
            const value = parts.substring(posEqual + 1);
            if (key !== "name" && key !== "label") {
                ret["error"] = "Invalid search key \"" + key + "\". Can only search for \"name\" or \"label\"";
            }
            else if (key in ret) {
                ret["error"] = "Key \"" + key + "\" can only be specified once.";
            }
            else {
                ret[key] = value;
            }
        }
        else if (parts.indexOf(" ") !== -1) {
            // ignore double spaces
        }
        else if ("name" in ret) {
            ret["error"] = "Cannot search for \"name\" attribute multiple times";
        }
        else {
            ret["name"] = parts;
        }
    });
    return ret;
}

function Path({ schema, path, filterValues, search, setSearch, setPage, org, t }: TempAny) {
    const [searchField, setSearchField] = useState(search);
    const [error, setError] = useState(undefined);

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

        if (filterField === "organization") {
            return null;
        }

        return <Select id={filterField} label={t("field.label." + filterField, filterField)} value={""} onChange={({ target }) => {
                navigate("/ui/resource/list" + path + "/" + target.value);
            }}>
            <SelectOption value="">{t("control.select.item.all")}</SelectOption>
            {filterValues && filterValues.map((fv: string) => <SelectOption key={fv} value={fv}>{fv}</SelectOption>)}
        </Select>;
    }

    function handleSearch() {
        const parsed: TempAny = parseSearch(searchField);
        if ("error" in parsed) {
            setError(parsed["error"]);
        }
        else {
            setError(undefined);
            setSearch(searchField);
            setPage(1);
        }
    }

    let filterField = getFilterField(schema, path);

    let pathParts = (path.startsWith("/") ? path.substring(1) : path).split("/");
    const schemaPath = getSchemaPath(schema, path) || "";
    let schemaPathParts = (schemaPath?.startsWith("/") ? schemaPath.substring(1) : schemaPath)?.split("/");
    for (let i = 0; i < schemaPathParts.length; i++) {
        if (schemaPathParts[i] === "{organization}" && org !== "") {
            schemaPathParts.splice(i, 1);
            pathParts.splice(i, 1);
            break;
        }
    }
    return <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
        <StyledBreadcrumbs data-testid="path_component" separator=">" aria-label="resources" style={{ fontSize: "2em", padding: "20px", display: "flex", flexWrap: "nowrap" }}>
            {pathParts && pathParts.map((p: string, index: number) => {
                if (index === 0) {
                    p = t("resource.label." + p, p);
                }
                if (index === pathParts.length - 1) {
                    return <Typography key={index} color="text.primary" style={{ fontSize: "1em" }}>{p}</Typography>
                }
                else if (index === pathParts.length - 2 && schemaPath != null && !schemaPath.endsWith("}")) {
                    let subPath = "/ui/resource/view/" + pathParts.slice(0, index + 1).join("/")
                    return <Link underline="hover" key={index} color="inherit" href="#" onClick={() => {
                        navigate(subPath);
                    }
                    }>{p}</Link>;
                }
                else {
                    let subPath = "/ui/resource/list/" + pathParts.slice(0, index + 1).join("/")
                    return <Link underline="hover" key={index} color="inherit" href="#" onClick={() => {
                        navigate(subPath);
                    }
                    }>{p}</Link>;
                }
            })}
            {renderFilter()}
        </StyledBreadcrumbs>
        <RestSpinner />
        {setSearch && <React.Fragment>
            <TextField
                required={false}
                data-testid="searchField"
                id="search"
                label={"search, i.e. \"somename\" or \"label=key=value,!otherkey name=abc\""}
                value={searchField}
                onChange={({ currentTarget: input }) => {
                    setSearchField(input.value);
                }}
                onKeyDown={(event) => {
                    if (event.keyCode === 13) {
                        handleSearch();
                    }
                }}
                error={error}
            />
            <Button data-testid="searchButton" onClick={handleSearch}
            >{t("button.search")}</Button>
        </React.Fragment>
        }
    </div>;
}

export default withTranslation()(Path);
