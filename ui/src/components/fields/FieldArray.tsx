// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import { ReactNode } from "react";
import { setValue, getValue } from "./utils";
import { Table, TableBody, TableCell, TableHead, TableRow } from "../controls/Table";
import { FieldBase_validate, FieldProps, getRecursiveValue } from './FieldBase'
import FieldMessage from "./FieldMessage";
import InfoPopup from "../controls/InfoPopup";
import { Field } from "./Field";

export default function FieldArray(props: FieldProps): ReactNode {
    switch (props.op) {
        case "edit": return edit();
        case "view": return view();
        case "validate": return FieldBase_validate(props);
    }

    /**
     * show Field of type Array using the values and schema definition
     * @returns
     */
    function edit(): ReactNode {
        const { prefix, parameter, values, required, setValues, readonly, t } = props;
        if (!parameter.items) {
            return FieldMessage({ ...props, message: "\"items\" attribute missing in schema definition" });
        }
        let ret = [];
        let value = getValue(values, prefix);
        if (value !== null) {
            for (let i = 0; i < value.length; i++) {
                let prefixKey = prefix + "." + i;
                const fieldEdit = Field({
                    ...props,
                    prefix: prefixKey,
                    parameter: parameter.items,
                    required: (i === 0 && required),
                    setValues: (vs: any) => {
                        vs = { ...vs };
                        let v = getValue(values, prefixKey);
                        setValue(vs, prefixKey, v === "" ? null : v);
                        setValues(vs)
                    }
                });
                ret.push(<TableRow key={prefixKey}>
                    <TableCell>
                        {fieldEdit}
                    </TableCell>
                </TableRow>);
            }
        }

        if (!readonly) {
            let nextIndex = value === null ? 0 : value.length;
            let prefixKey = prefix + "." + nextIndex;
            let fieldEdit = Field({
                ...props,
                prefix: prefixKey,
                parameter: parameter.items,
                setValues: (vs) => {
                    vs = { ...vs };
                    let v = getValue(values, prefixKey);
                    setValue(vs, prefixKey, v === "" ? null : v);
                    setValues(vs);
                }
            });
            ret.push(<TableRow key={prefixKey}>
                <TableCell>
                    {fieldEdit}
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

    function view(): ReactNode {
        const { prefix, values } = props;
        return getRecursiveValue(getValue(values, prefix), props.t);
    }
}
