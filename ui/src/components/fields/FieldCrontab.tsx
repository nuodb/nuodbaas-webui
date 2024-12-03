// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { getValue, setValue } from "./utils"
import FieldBase, { FieldBaseType, FieldProps } from "./FieldBase"
import { ReactNode } from 'react';
import Select, { SelectOption } from "../controls/Select";

export default function FieldCrontab(props: FieldProps): FieldBaseType {

    /**
     * show Field of type Boolean using the values and schema definition
     */
    function show(): ReactNode {
        const { prefix, label, values, parameter, required, setValues, autoFocus, readonly, t } = props;
        let value = getValue(values, prefix) || "";
        const parts = value.split(" ");
        let frequency = "";
        let minute = "";
        let hour = "";
        let dayOfMonth = "";
        let month = "";
        let weekday = "";
        const isOther = parts.length !== 1;
        if (!isOther) {
            frequency = parts[0];
        }
        else {
            frequency = "other";
            minute = parts[0] || "*";
            hour = parts[1] || "*";
            dayOfMonth = parts[2] || "*";
            month = parts[3] || "*";
            weekday = parts[4] || "*";
        }

        function renderNumbersOptions(from: number, to: number, labels?: string[]) {
            let ret = [];
            ret.push(<SelectOption key="*" value="*">{t("field.crontab.any")}</SelectOption>);
            for (let i = from; i <= to; i++) {
                const item = String(i);
                const label = labels ? labels[i - from] : item;
                ret.push(<SelectOption key={item} value={item}>{label}</SelectOption>);
            }
            return ret;
        }

        function setPart(index: number, partValue: string) {
            let v = { ...values };
            let parts = value.split(" ");
            parts[index] = partValue;
            setValue(v, prefix, parts.join(" "));
            setValues(v);
        }

        return <div className={isOther && "NuoFieldCrontab" || ""}>
            <label id={"label_" + prefix}>{isOther && label}</label>
            <Select id={prefix} key={prefix} label={!isOther && label || ""} value={frequency} autoFocus={autoFocus} onChange={(e: any) => {
                let v = { ...values };
                if (e.target.value === "other") {
                    setValue(v, prefix, "* * * * *");
                }
                else {
                    setValue(v, prefix, e.target.value);
                }
                setValues(v);
            }} onBlur={() => FieldBase(props).validate()} disabled={readonly}>
                <SelectOption value="">{t("field.select.selectItem")}</SelectOption>
                <SelectOption value="@hourly">@hourly</SelectOption>
                <SelectOption value="@daily">@daily</SelectOption>
                <SelectOption value="@weekly">@weekly</SelectOption>
                <SelectOption value="@monthly">@monthly</SelectOption>
                <SelectOption value="@yearly">@yearly</SelectOption>
                <SelectOption value="other">Other</SelectOption>
            </Select>
            {parts.length === 5 && <div className="NuoCrontabContainer">
                <Select id={prefix} key={prefix} label={t("field.crontab.minute")} value={minute} autoFocus={autoFocus} onChange={(e: any) => {
                    setPart(0, e.target.value);
                }} onBlur={() => FieldBase(props).validate()} disabled={readonly}>
                    {renderNumbersOptions(0, 59)}
                </Select>
                <Select id={prefix} key={prefix} label={t("field.crontab.hour")} value={hour} autoFocus={autoFocus} onChange={(e: any) => {
                    setPart(1, e.target.value);
                }} onBlur={() => FieldBase(props).validate()} disabled={readonly}>
                    {renderNumbersOptions(0, 59)}
                </Select>
                <Select id={prefix} key={prefix} label={t("field.crontab.dayOfMonth")} value={dayOfMonth} autoFocus={autoFocus} onChange={(e: any) => {
                    setPart(2, e.target.value);
                }} onBlur={() => FieldBase(props).validate()} disabled={readonly}>
                    {renderNumbersOptions(1, 31)}
                </Select>
                <Select id={prefix} key={prefix} label={t("field.crontab.month")} value={month} autoFocus={autoFocus} onChange={(e: any) => {
                    setPart(3, e.target.value);
                }} onBlur={() => FieldBase(props).validate()} disabled={readonly}>
                    {renderNumbersOptions(1, 12, [
                        t("field.crontab.january"),
                        t("field.crontab.february"),
                        t("field.crontab.march"),
                        t("field.crontab.april"),
                        t("field.crontab.may"),
                        t("field.crontab.june"),
                        t("field.crontab.july"),
                        t("field.crontab.august"),
                        t("field.crontab.september"),
                        t("field.crontab.october"),
                        t("field.crontab.november"),
                        t("field.crontab.december"),
                    ])}
                </Select>
                <Select id={prefix} key={prefix} label={t("field.crontab.weekday")} value={weekday} autoFocus={autoFocus} onChange={(e: any) => {
                    setPart(4, e.target.value);
                }} onBlur={() => FieldBase(props).validate()} disabled={readonly}>
                    {renderNumbersOptions(0, 6, [
                        t("field.crontab.sunday"),
                        t("field.crontab.monday"),
                        t("field.crontab.tuesday"),
                        t("field.crontab.wednesday"),
                        t("field.crontab.thursday"),
                        t("field.crontab.friday"),
                        t("field.crontab.saturday")
                    ])}
                </Select></div>}
        </div>;
    }

    function getDisplayValue(): ReactNode {
        const { prefix, values, t } = props;
        const value = getValue(values, prefix);
        return t("field.enum." + prefix + "." + value, prefix + "." + value);
    }

    return { ...FieldBase(props), show, getDisplayValue };
}