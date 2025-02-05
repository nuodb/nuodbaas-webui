// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.
import { ReactNode } from "react";

type TableProps = {
    children: JSX.Element[],
    key?: string,
    "data-testid"?: string,
}

interface ChildProps {
    children?: ReactNode,
    className?: string,
    "data-testid"?: string,
}

interface CellProps extends ChildProps {
    colSpan?: number
}

export function Table(props: TableProps): JSX.Element {
    return <table data-testid={props["data-testid"]} className="NuoTableTable">{props.children}</table>
}

export function TableHead(props: ChildProps): JSX.Element {
    return <thead className="NuoTableThead">{props.children}</thead>
}

export function TableRow(props: ChildProps): JSX.Element {
    return <tr className="NuoTableTr">{props.children}</tr>
}

export function TableCell(props: CellProps): JSX.Element {
    return <td data-testid={props["data-testid"]} className={["NuoTableTd", props.className].join(" ")}>{props.children}</td>
}

export function TableTh(props: CellProps): JSX.Element {
    return <th data-testid={props["data-testid"]} className={["NuoTableTh", props.className].join(" ")} colSpan={props.colSpan}>{props.children}</th>
}

export function TableBody(props: ChildProps): JSX.Element {
    return <tbody className="NuoTableTbody">{props.children}</tbody>
}
