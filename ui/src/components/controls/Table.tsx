// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.
import { ReactNode } from "react";

type TableProps = {
    children: JSX.Element[],
    key?: string,
    "data-testid"?: string,
}

type ChildProps = {
    children?: ReactNode,
    className?: string,
    "data-testid"?: string,
}

export function Table(props: TableProps): JSX.Element {
    return <div className="NuoTableContainer"><table data-testid={props["data-testid"]} className="NuoTableTable">{props.children}</table></div>
}

export function TableHead(props: ChildProps): JSX.Element {
    return <thead className="NuoTableThead">{props.children}</thead>
}

export function TableRow(props: ChildProps): JSX.Element {
    return <tr className="NuoTableTr">{props.children}</tr>
}

export function TableCell(props: ChildProps): JSX.Element {
    return <td data-testid={props["data-testid"]} className={["NuoTableTd", props.className].join(" ")}>{props.children}</td>
}

export function TableTh(props: ChildProps): JSX.Element {
    return <th data-testid={props["data-testid"]} className={["NuoTableTh", props.className].join(" ")}>{props.children}</th>
}

export function TableBody(props: ChildProps): JSX.Element {
    return <tbody className="NuoTableTbody">{props.children}</tbody>
}
