// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import React, { useState } from "react"
import { withTranslation } from "react-i18next";
import TextField from "../../controls/TextField"
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

type SearchProps = {
    search: string;
    setSearch: (search: string) => void;
    t: TempAny;
}

function Search({ search, setSearch, t }: SearchProps) {
    const [searchField, setSearchField] = useState(search);
    const [error, setError] = useState(undefined);

    function handleSearch() {
        const parsed: TempAny = parseSearch(searchField);
        if ("error" in parsed) {
            setError(parsed["error"]);
        }
        else {
            setError(undefined);
            setSearch(searchField);
        }
    }

    return <div style={{ display: "flex", flexDirection: "row", flex: "1 1 auto", alignItems: "center", justifyContent: "center" }}>
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
    </div>;
}

export default withTranslation()(Search);
