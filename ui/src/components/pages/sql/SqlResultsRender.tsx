// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React, { ReactNode } from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, TableTh } from '../../controls/Table';
import { withTranslation } from 'react-i18next';
import { SqlResponse } from '../../../utils/SqlSocket';
import FilterListIcon from '@mui/icons-material/FilterList';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { MenuItemProps } from '../../../utils/types';
import Menu from '../../controls/Menu';
import EditIcon from '@mui/icons-material/Edit';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

type SqlTableProps = {
    results?: SqlResponse;
    isFiltered?: boolean;
    setShowFilterDialog?: (showFilterDialog: boolean) => void;
    orderBy?: string;
    setOrderBy?: (orderBy: string) => void;
    isAscending?: boolean;
    setIsAscending?: (isAscending: boolean) => void;
    onAdd?: () => void;
    onEdit?: (name: string) => void;
    onDelete?: (name: string) => void;
    addLabel?: ReactNode;
    t: any;
};

function SqlResultsRender({ results, setShowFilterDialog, orderBy, setOrderBy, isAscending, setIsAscending, isFiltered, onAdd, onEdit, onDelete, addLabel, t }: SqlTableProps) {
    if(!results) {
        return null;
    }
    else if (results.error) {
        return <div className="NuoError">{results.error}</div>
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

    function renderMenuCell(username: string, zIndex: number, t: any) {
        const buttons: MenuItemProps[] = [];
        if (onEdit) {
            buttons.push({
                "data-testid": "edit_button",
                id: "edit",
                icon: <EditIcon />,
                label: t("button.edit"),
                onClick: () => {
                    onEdit(username);
                    return true;
                }
            });
        }
        if (onDelete) {
            buttons.push({
                "data-testid": "delete_button",
                id: "delete",
                icon: <DeleteForeverIcon />,
                label: t("button.delete"),
                onClick: () => {
                    onDelete(username);
                    return true;
                },
            });
        }
        if (buttons.length === 0) {
            return null;
        }

        return <TableCell key={username} className="NuoTableMenuCell NuoStickyRight" zIndex={zIndex}>
            <Menu data-testid="resource-popup-menu" popupId={"row_menu_" + username} items={buttons} align="right" />
        </TableCell>;
    }

    return <Table>
        <TableHead>
            <TableRow>
                {results.columns?.map((column, index: number) => <TableTh key={index} className={(onEdit || onDelete) && index === 0 ? "NuoStickyLeft" : ""}>
                    <div className="NuoRow">
                        {column.label || column.name}
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
                {isFiltered !== undefined && <TableTh className="NuoTableMenuCell NuoStickyRight">
                    <div className={isFiltered ? "NuoFilterActive" : "NuoFilterInactive"} onClick={() => setShowFilterDialog && setShowFilterDialog(true)}>
                        <FilterListIcon />
                    </div>
                </TableTh>}
                {onAdd && addLabel && <TableTh className="NuoTableMenuCell NuoStickyRight">
                    <div className="NuoColumn NuoRight"><button onClick={() => onAdd()}>{addLabel}</button></div>
                </TableTh>}
            </TableRow>
        </TableHead>
        <TableBody>
            {results.rows?.map((row, index) => <TableRow key={index}>
                {row.values.map((col, cindex) => <TableCell className={onEdit && cindex === 0 ? "NuoStickyLeft" : ""} key={cindex}>
                    {(onEdit && cindex === 0)
                        ? <button
                            className="NuoLinkButton"
                            style={{ whiteSpace: "pre" }}
                            onClick={() => onEdit(col)}
                        >
                            {String(col).trim()}
                        </button>
                        : <div style={{ whiteSpace: "pre" }}>
                            {String(col).trim()}
                        </div>
                    }
                </TableCell>)}
                {renderMenuCell(row.values[0], 1000 + (results.rows || []).length - 1 - index, t)}
            </TableRow>)}
        </TableBody>
    </Table>
}

export default withTranslation()(SqlResultsRender);
