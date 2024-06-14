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
export default function Table({ schema, data, path }) {
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

    let tableFields = getTableFields();

    return (<TableContainer component={Paper}>
        <TableMaterial sx={{ minWidth: 650 }}>
            <TableHead>
                <TableRow>
                    {tableFields.map(field => <TableCell key={field}>{field === "$ref" ? "" : field}</TableCell>)}
                </TableRow>
            </TableHead>
            <TableBody>
                {data.map((row, index) => (
                    <TableRow key={row["$ref"] || index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        {tableFields.map(field => <TableCell key={field}>
                            {field === "$ref" ? <React.Fragment>
                                <Button variant="text" onClick={() =>
                                    navigate("/ui/resource/edit" + path + "/" + row[field])
                                }>Edit</Button>
                                {("delete" in (getResourceByPath(schema, path + "/" + row[field]) || {})) && <Button variant="text" onClick={async () => {
                                    await deleteResource(path + "/" + row[field]);
                                    window.location.reload();
                                }}>Delete</Button>}
                            </React.Fragment> : String(row[field])}
                        </TableCell>)}
                    </TableRow>
                ))}
            </TableBody>
        </TableMaterial>
    </TableContainer>
    );
}
