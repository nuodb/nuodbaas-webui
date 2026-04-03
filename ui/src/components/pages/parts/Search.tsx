// (C) Copyright 2025-2026 Dassault Systemes SE.  All Rights Reserved.

import React, { useEffect, useState } from "react"
import { withTranslation } from "react-i18next";
import TextField from "../../controls/TextField"
import { TempAny } from "../../../utils/types"
import SearchIcon from '@mui/icons-material/Search';
import Menu from "../../controls/Menu";
import FilterListIcon from '@mui/icons-material/FilterList';
import ListResourceFilter from "../ListResourceFilter";
import { Feature } from "../../../utils/schema";

type SearchProps = {
    path: string;
    search: string;
    setSearch: (search: string) => void;
    fieldNames?: string[];
    t: TempAny;
}

function Search({ path, search, setSearch, fieldNames, t }: SearchProps) {
    const [searchField, setSearchField] = useState(search);
    const [showSearchFilterDialog, setShowSearchFilterDialog] = useState<boolean>(false);

    useEffect(() => {
        setSearchField(search);
    }, [search]);

    let icon;
    if(Feature.FILTER_ON_SERVER) {
        icon = fieldNames && <div
                data-testid="search-filter" onClick={() => {
                    setShowSearchFilterDialog(true);
                }}>
                <FilterListIcon />
            </div>
    }
    else {
        icon = fieldNames && <Menu
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
                defaultItem={undefined} align="right" />
    }

    return <div style={{ display: "flex", flexDirection: "row", flex: "1 1 auto", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1100 }}>
        {Feature.FILTER_ON_SERVER && <ListResourceFilter show={showSearchFilterDialog} setShow={setShowSearchFilterDialog} path={path} search={searchField} setSearch={(search: string) => {
            setSearchField(search);
            setSearch(search);
        }} />}
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
            icon={icon}
        />

    </div>;
}

export default withTranslation()(Search);
