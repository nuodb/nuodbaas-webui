// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { ReactNode } from "react";
import { setValue, getValue } from "./utils";
import FieldBase, { FieldBaseType, FieldProps } from './FieldBase'
import FieldFactory from "./FieldFactory"
import FieldMessage from "./FieldMessage";
import { isMaterial } from "../../utils/Customizations";
import { Table, TableBody, TableCell, TableHead, TableRow } from "../controls/Table";

export default function FieldArray(props: FieldProps): FieldBaseType {
    /**
     * show Field of type Array using the values and schema definition
     * @returns
     */
    function show(): ReactNode {
        const { prefix, parameter, values, errors, required, setValues, updateErrors, readonly } = props;
        if (!parameter.items) {
            return FieldMessage({ ...props, message: "\"items\" attribute missing in schema definition" }).show();
        }
        let ret = [];
        let value = getValue(values, prefix);
        if (value !== null) {
            for (let i = 0; i < value.length; i++) {
                let prefixKey = prefix + "." + i;
                const field = FieldFactory.create({
                    ...props,
                    prefix: prefixKey, parameter: parameter.items, values, errors, required: (i === 0 && required), setValues: (vs) => {
                        vs = { ...vs };
                        let v = getValue(values, prefixKey);
                        setValue(vs, prefixKey, v === "" ? null : v);
                        setValues(vs)
                    }, updateErrors
                });
                if (isMaterial()) {
                    ret.push(<TableRow key={prefixKey}>
                        <TableCell>
                            {field.show()}
                        </TableCell>
                    </TableRow>);
                }
                else {
                    ret.push(<tr key={prefixKey}>
                        <td>{field.show()}</td>
                    </tr>);
                }
            }
        }

        if (!readonly) {
            let nextIndex = value === null ? 0 : value.length;
            let prefixKey = prefix + "." + nextIndex;
            let field = FieldFactory.create({
                ...props,
                prefix: prefixKey, parameter: parameter.items, values, setValues: (vs) => {
                    vs = { ...vs };
                    let v = getValue(values, prefixKey);
                    setValue(vs, prefixKey, v === "" ? null : v);
                    setValues(vs);
                }, updateErrors
            });
            if (isMaterial()) {
                ret.push(<TableRow key={prefixKey}>
                    <TableCell>
                        {field.show()}
                    </TableCell>
                </TableRow>);
            }
            else {
                ret.push(<tr key={prefixKey}>
                    <td>
                        {field.show()}
                    </td>
                </tr>);
            }
        }

        if (isMaterial()) {
            return <Table key={prefix}>
                <TableHead>
                    <TableRow>
                        <TableCell>{prefix.split(".").slice(-1)[0]}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {ret}
                </TableBody>
            </Table>;
        }
        else {
            return <table key={prefix} className="FieldBase FieldArray">
                <thead>
                    <tr>
                        <th>{prefix.split(".").slice(-1)[0]}</th>
                    </tr>
                </thead>
                <tbody>
                    {ret}
                </tbody>
            </table>
        }
    }

    function getDisplayValue(): ReactNode {
        const { prefix, values } = props;
        const value = getValue(values, prefix);
        return value && value.map((v: string, index: number) => <div key={index}>{v}</div>);
    }

    return { ...FieldBase(props), show, getDisplayValue };
}
