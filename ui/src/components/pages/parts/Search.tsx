// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React, { useEffect, useState } from "react"
import { withTranslation } from "react-i18next";
import TextField from "../../controls/TextField"
import { TempAny } from "../../../utils/types"
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Menu from "../../controls/Menu";

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
            else if (key === "name"){
                ret[key] = value.toLowerCase();
            }
            else {
                ret[key] = value; //TODO agr22 Control plane does case sensitive search for labels - keeping this for now.
            }
        }
        else if (parts.indexOf(" ") !== -1) {
            // ignore double spaces
        }
        else if ("name" in ret) {
            ret["error"] = "Cannot search for \"name\" attribute multiple times";
        }
        else {
            ret["name"] = parts.toLowerCase();
        }
    });
    return ret;
}

type SearchProps = {
    search: string;
    setSearch: (search: string) => void;
    fieldNames?: string[];
    t: TempAny;
}

function Search({ search, setSearch, fieldNames, t }: SearchProps) {
    const [searchField, setSearchField] = useState(search);
    const [error, setError] = useState(undefined);

    useEffect(() => {
        setSearchField(search);
    }, [search]);

    return <div style={{ display: "flex", flexDirection: "row", flex: "1 1 auto", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1100 }}>
        <TextField
            required={false}
            data-testid="searchField"
            id="search"
            label={t("field.label.search")}
            value={searchField}
            leftIcon={<SearchIcon />}
            onChange={({ currentTarget: input }) => {
                setSearchField(input.value);
            }}
            onKeyDown={(event) => {
                if (event.key === "Enter") {
                    setSearch(searchField);
                }
            }}
            icon={fieldNames && <Menu
                data-testid="search-popup-menu"
                popupId="search-popup-menu"
                items={fieldNames.map(fn => {
                    return {
                        id: fn,
                        label: t("field.label." + fn, fn),
                        onClick: () => {
                            search = searchField.trim();
                            if (search) {
                                search += " ";
                            }
                            search += fn + "=";
                            setSearchField(search);
                            const elementId = document.getElementById("search");
                            if (elementId) {
                                elementId.focus();
                            }
                            return true;
                        }
                    };
                })}
                defaultItem={undefined} align="right" />}
            error={error}
        />

    </div>;
}

export default withTranslation()(Search);
