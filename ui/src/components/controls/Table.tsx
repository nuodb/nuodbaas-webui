import { Card, Table as MuiTable, TableHead as MuiTableHead, TableRow as MuiTableRow, TableCell as MuiTableCell, TableBody as MuiTableBody } from '@mui/material';
import TableContainer from '@mui/material/TableContainer';
import { isMaterial } from '../../utils/Customizations';
import { ReactNode } from "react";

type TableProps = {
    children: JSX.Element[],
    key?: string,
    "data-testid"?: string,
}

type ChildProps = {
    children?: ReactNode,
    "data-testid"?: string,
}

export function Table(props: TableProps): JSX.Element {
    if (isMaterial()) {
        return <TableContainer data-testid={props["data-testid"]} component={Card}>
            <MuiTable>
                {props.children}
            </MuiTable>
        </TableContainer>
    }
    else {
        return <table data-testid={props["data-testid"]}>{props.children}</table>
    }
}

export function TableHead(props: ChildProps): JSX.Element {
    if (isMaterial()) {
        return <MuiTableHead>
            {props.children}
        </MuiTableHead>
    }
    else {
        return <thead>{props.children}</thead>
    }
}

export function TableRow(props: ChildProps): JSX.Element {
    if (isMaterial()) {
        return <MuiTableRow>
            {props.children}
        </MuiTableRow>
    }
    else {
        return <tr>{props.children}</tr>
    }
}

export function TableCell(props: ChildProps): JSX.Element {
    if (isMaterial()) {
        return <MuiTableCell data-testid={props["data-testid"]}>
            {props.children}
        </MuiTableCell>
    }
    else {
        return <td data-testid={props["data-testid"]}>{props.children}</td>
    }
}

export function TableBody(props: ChildProps): JSX.Element {
    if (isMaterial()) {
        return <MuiTableBody>
            {props.children}
        </MuiTableBody>
    }
    else {
        return <tbody>{props.children}</tbody>
    }
}
