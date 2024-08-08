import React from "react";
import { useNavigate } from 'react-router-dom';
import { deleteResource, getResourceByPath } from '../../../utils/schema'
import Button from '@mui/material/Button';
import TableMaterial from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

/**
 * shows a table with all the "data". Columns are determined by the schema definition for the "path"
 * @param {*} param0
 * @returns
 */
export default function Table(props) {
    const { schema, data, path } = props;
    let navigate = useNavigate();

    /**
     * Find all fields to be shown in the table
     * - checks all data rows/columns for available fields ignoring "resourceVersion"
     * @returns
     */
    function getTableFields() {
        let resourcesByPath = getResourceByPath(schema, path);
        let methodSchema = resourcesByPath["get"];
        if(!methodSchema || !data) {
            return [];
        }
        let dataKeys = {};
        data.forEach(row => {
            Object.keys(row).forEach(key => {
                dataKeys[key] = "";
            });
        })

        let tableFields = [];
        if("$ref" in dataKeys) {
            tableFields.push("$ref");
            delete dataKeys["$ref"];
        }
        if("resourceVersion" in dataKeys) {
            delete dataKeys["resourceVersion"]
        }
        return [...tableFields, ...Object.keys(dataKeys)];
    }

    function showValue(value) {
        if(typeof value === "object") {
            if(Array.isArray(value)) {
                return value.map((v,index) => <div key={index}>{showValue(v)}</div>);
            }
            else {
                return <dl className="map">{Object.keys(value).map(key => <div key={key}><dt>{String(key)}</dt><dd>{showValue(value[key])}</dd></div>)}</dl>
            }
        }
        else if(typeof value === "string") {
            if(value.indexOf("\n") !== -1) {
                value = value.substring(0, value.indexOf("\n")) + "...";
            }
            if(value.length > 80) {
                value = value.substring(0, 80) + "...";
            }
            return String(value);
        }
        else {
            return String(value);
        }
    }

    let tableFields = getTableFields();

    return (<TableContainer component={Paper}>
        <TableMaterial data-testid={props["data-testid"]} sx={{ minWidth: 650 }}>
            <TableHead>
                <TableRow>
                    {tableFields.map(field => <TableCell key={field}>{field === "$ref" ? "" : field}</TableCell>)}
                </TableRow>
            </TableHead>
            <TableBody>
                {data.map((row, index) => (
                    <TableRow key={row["$ref"] || index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        {tableFields.map(field => {
                            if(field === "$ref") {
                                return <TableCell key={field}>
                                    <Button data-testid="edit_button" variant="text" onClick={() =>
                                        navigate("/ui/resource/edit" + path + "/" + row[field])
                                    }>Edit</Button>
                                    {("delete" in (getResourceByPath(schema, path + "/" + row[field]) || {})) && <Button data-testid="delete_button" variant="text" onClick={async () => {
                                        await deleteResource(path + "/" + row[field]);
                                        window.location.reload();
                                    }}>Delete</Button>}</TableCell>;
                            }
                            else {
                                return <TableCell key={field}>{showValue(row[field])}</TableCell>;
                            }
                        })}
                    </TableRow>
                ))}
            </TableBody>
        </TableMaterial>
    </TableContainer>
    );
}
