// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, TableTh } from '../../controls/Table';
import { withTranslation } from 'react-i18next';
import { SqlResponse } from '../../../utils/SqlSocket';

type SqlTableProps = {
    results?: SqlResponse;
};

function SqlResultsRender({results}: SqlTableProps) {
    if(!results) {
        return null;
    }
    else if (results.error) {
        return <div className="NuoSqlError">{results.error.split("\n").map((line, index) => <div key={index}>{line}</div>)}</div>
    }
    return <Table>
        <TableHead>
            <TableRow>
                {results.columns?.map((column, index: number) => <TableTh key={index}>{column.name}</TableTh>)}
            </TableRow>
        </TableHead>
        <TableBody>
            {results.rows?.map((row, index) => <TableRow key={index}>
                {row.values.map((col, cindex) => <TableCell key={cindex}>{col}</TableCell>)}
            </TableRow>)}
        </TableBody>
    </Table>
}

export default withTranslation()(SqlResultsRender);
