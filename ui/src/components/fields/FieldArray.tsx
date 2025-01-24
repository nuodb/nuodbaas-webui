// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import { ReactNode } from "react";
import { setValue, getValue } from "./utils";
import { Table, TableBody, TableCell, TableHead, TableRow } from "../controls/Table";
import FieldBase, { FieldBaseType, FieldProps } from './FieldBase'
import FieldFactory from "./FieldFactory"
import FieldMessage from "./FieldMessage";
import InfoPopup from "../controls/InfoPopup";

export default function FieldArray(props: FieldProps): FieldBaseType {
    /**
     * show Field of type Array using the values and schema definition
     * @returns
     */
    function show(): ReactNode {
        const { prefix, parameter, values, errors, required, setValues, updateErrors, readonly, t } = props;
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
                ret.push(<TableRow key={prefixKey}>
                    <TableCell>
                        {field.show()}
                    </TableCell>
                </TableRow>);
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
            ret.push(<TableRow key={prefixKey}>
                <TableCell>
                    {field.show()}
                </TableCell>
            </TableRow>);
        }

        return <Table key={prefix}>
            <TableHead>
                <TableRow>
                    <TableCell className="NuoArrayLabel">
                        {t("field.label." + prefix, prefix)}
                        <InfoPopup description={parameter.description} />
                    </TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {ret}
            </TableBody>
        </Table>;
    }

    function getDisplayValue(): ReactNode {
        const { prefix, values } = props;
        const value = getValue(values, prefix);
        return value && value.map((v: string, index: number) => {
            return <div key={index}>{String(v)}</div>;
        });
    }

    return { ...FieldBase(props), show, getDisplayValue };
}
