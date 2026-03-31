// (C) Copyright 2025-2026 Dassault Systemes SE.  All Rights Reserved.

import React, { useEffect, useState } from "react"
import { withTranslation } from "react-i18next";
import TextField from "../../controls/TextField"
import { TempAny } from "../../../utils/types"
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ListResourceFilter from "../ListResourceFilter";

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

    return <div style={{ display: "flex", flexDirection: "row", flex: "1 1 auto", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1100 }}>
        <ListResourceFilter show={showSearchFilterDialog} setShow={setShowSearchFilterDialog} path={path} search={searchField} setSearch={(search: string) => {
            setSearchField(search);
            setSearch(search);
        }} />
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
            icon={fieldNames && <div
                data-testid="search-filter" onClick={() => {
                    setShowSearchFilterDialog(true);
                }}>
                <FilterListIcon />
            </div>}
        />

    </div>;
}

export default withTranslation()(Search);
