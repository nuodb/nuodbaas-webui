import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import Button from '@mui/material/Button'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField'
import { styled } from '@mui/material';
import RestSpinner from './RestSpinner';
import { getFilterField } from "../../../utils/schema";

export function parseSearch(search) {
    search = search.trim();
    let ret = {};

    search.split(" ").forEach(parts => {
        const posEqual = parts.indexOf("=");
        if(posEqual !== -1) {
            const key = parts.substring(0, posEqual);
            const value = parts.substring(posEqual+1);
            if(key !== "name" && key !== "label") {
                ret["error"] = "Invalid search key \"" + key + "\". Can only search for \"name\" or \"label\"";
            }
            else if(key in ret) {
                ret["error"] = "Key \"" + key + "\" can only be specified once.";
            }
            else {
                ret[key] = value;
            }
        }
        else if(parts.indexOf("") !== -1) {
            // ignore double spaces
        }
        else if("name" in ret) {
            ret["error"] = "Cannot search for \"name\" attribute multiple times";
        }
        else {
            ret["name"] = parts;
        }
    });
    return ret;
}

export default function Path({schema, path, filterValues, search, setSearch, setPage}) {
    const [ searchField, setSearchField ] = useState(search);
    const [ error, setError ] = useState(null);

    const navigate = useNavigate();

    const StyledBreadcrumbs = styled(Breadcrumbs)({
        '.MuiBreadcrumbs-ol': {
            flexWrap: 'nowrap'
        }
    });

    function renderFilter() {
        if(!filterValues || filterValues.length === 0) {
            return null;
        }

        return <FormControl>
            <InputLabel id="filter_label">{filterField}</InputLabel>
            <Select labelId="filter_label" id="filter" value={"__all__"} label={filterField} onChange={({target})=>{
                navigate("/ui/resource/list" + path + "/" + target.value);
            }}>
                <MenuItem value={"__all__"}>--- All ---</MenuItem>
                {filterValues && filterValues.map(fv => <MenuItem key={fv} value={fv}>{fv}</MenuItem>)}
            </Select>
        </FormControl>;
    }

    function handleSearch() {
        const parsed = parseSearch(searchField);
        console.log("parsed", parsed);
        if("error" in parsed) {
            setError(parsed["error"]);
        }
        else {
            setError(null);
            setSearch(searchField);
            setPage(1);
        }
    }

    let filterField = getFilterField(schema, path);

    let pathParts = (path.startsWith("/") ? path.substring(1) : path).split("/");
    return <div style={{display: "flex", flexDirection: "row", alignItems: "center"}}>
        <StyledBreadcrumbs data-testid="path_component" separator=">" aria-label="resources" style={{fontSize: "2em", padding: "20px", display: "flex", flexWrap: "nowrap"}}>
        {pathParts && pathParts.map((p,index) => {
            if(index === pathParts.length-1) {
                return <Typography key={index} color="text.primary" style={{fontSize: "1em"}}>{p}</Typography>
            }
            else {
                let subPath = "/ui/resource/list/" + pathParts.slice(0, index+1).join("/")
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
                fullWidth={true}
                required={false}
                data-testid="searchField"
                id="search"
                name="search"
                label={"search, i.e. \"somename\" or \"labels=key=value,!otherkey name=abc\""}
                value={searchField}
                onChange={({ currentTarget: input }) => {
                    setSearchField(input.value);
                }}
                onKeyDown={(event) => {
                    if(event.keyCode === 13) {
                        handleSearch();
                    }
                }}
                error={error !== null}
                helperText={error}
            />
            <Button data-testid="searchButton" onClick={handleSearch}
            >Search</Button>
            </React.Fragment>
        }
    </div>;
}