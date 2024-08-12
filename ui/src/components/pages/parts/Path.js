import React from "react"
import { useNavigate } from "react-router-dom"
import Breadcrumbs from '@mui/material/Breadcrumbs'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography';
import RestSpinner from './RestSpinner';
import { getFilterField } from "../../../utils/schema";

export default function Path({schema, path, filterValues}) {
    const navigate = useNavigate();

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
    let filterField = getFilterField(schema, path);

    let pathParts = (path.startsWith("/") ? path.substring(1) : path).split("/");
    return <div style={{display: "flex", flexDirection: "row", alignItems: "center"}}>
        <Breadcrumbs data-testid="path_component" separator=">" aria-label="resources" style={{fontSize: "2em", padding: "20px"}}>
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
        </Breadcrumbs>
        <RestSpinner />
    </div>;
}