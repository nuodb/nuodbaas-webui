// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, TableTh } from '../../controls/Table';
import { withTranslation } from 'react-i18next';
import { SqlResponse } from '../../../utils/SqlSocket';
import FilterListIcon from '@mui/icons-material/FilterList';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

type SqlTableProps = {
    results?: SqlResponse;
    isFiltered?: boolean;
    setShowFilterDialog?: (showFilterDialog: boolean) => void;
    orderBy?: string;
    setOrderBy?: (orderBy: string) => void;
    isAscending?: boolean;
    setIsAscending?: (isAscending: boolean) => void;
};

function SqlResultsRender({ results, setShowFilterDialog, orderBy, setOrderBy, isAscending, setIsAscending, isFiltered }: SqlTableProps) {
    if(!results) {
        return null;
    }
    else if (results.error) {
        return <div className="NuoSqlError">{results.error}</div>
    }

    function sort(name: string) {
        if (setOrderBy && setIsAscending) {
            if (orderBy !== name) {
                setOrderBy(name);
            }
            else {
                setIsAscending(!isAscending);
            }
        }
    }

    return <Table>
        <TableHead>
            <TableRow>
                {results.columns?.map((column, index: number) => <TableTh key={index}>
                    <div className="NuoRow">
                        {column.name}
                        {orderBy !== undefined && <div onClick={() => sort(column.name)}>
                            {orderBy === column.name ?
                                (isAscending ?
                                    <ExpandLessIcon />
                                    :
                                    <ExpandMoreIcon />)
                                :
                                <UnfoldMoreIcon style={{ color: "lightgray" }} />}
                        </div>}
                    </div>
                </TableTh>)}
                {isFiltered !== undefined && <TableTh className="NuoTableMenuCell">
                    <div className={isFiltered ? "NuoFilterActive" : "NuoFilterInactive"} onClick={() => setShowFilterDialog && setShowFilterDialog(true)}>
                        <FilterListIcon />
                    </div>
                </TableTh>}
            </TableRow>
        </TableHead>
        <TableBody>
            {results.rows?.map((row, index) => <TableRow key={index}>
                {row.values.map((col, cindex) => <TableCell key={cindex}>{String(col)}</TableCell>)}
                {isFiltered !== undefined && <TableCell>&nbsp;</TableCell>}
            </TableRow>)}
        </TableBody>
    </Table>
}

export default withTranslation()(SqlResultsRender);
