// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import { FieldBase_display, FieldBase_validate, FieldProps } from "./FieldBase";
import { getValue, setValue } from "./utils"
import { JSX, ReactNode, useState } from "react";
import TextField from "../controls/TextField";
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import Dialog from "../pages/parts/Dialog";

type CalendarPopupProps = {
    value: string,
    setValue: (value: Date) => void,
    t: any,
};

function arrayFromTo(from: number, to: number) {
    return Array(to - from + 1).fill(1).map((element, index) => index + from);
}

function twoDigits(value: number) {
    if (value < 10 && value >= 0) {
        return "0" + String(value);
    }
    else {
        return String(value);
    }
}

function CalendarPopup(props: CalendarPopupProps): JSX.Element {
    const { value, t } = props;
    const date = value ? new Date(value) : new Date();

    const [selectedMonth, setSelectedMonth] = useState<number>(date.getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(date.getFullYear());
    const [selectedDate, setSelectedDate] = useState<Date>(date);
    const [selectedTimezone, setSelectedTimezone] = useState("local");

    function getYear() { return selectedTimezone === "utc" ? selectedDate.getUTCFullYear() : selectedDate.getFullYear(); }
    function getMonth() { return selectedTimezone === "utc" ? selectedDate.getUTCMonth() : selectedDate.getMonth(); }
    function getDate() { return selectedTimezone === "utc" ? selectedDate.getUTCDate() : selectedDate.getDate(); }
    function getHours() { return selectedTimezone === "utc" ? selectedDate.getUTCHours() : selectedDate.getHours(); }
    function getMinutes() { return selectedTimezone === "utc" ? selectedDate.getUTCMinutes() : selectedDate.getMinutes(); }
    function setHours(hour: number) {
        let newDate = new Date(selectedDate);
        if (selectedTimezone === "utc") newDate.setUTCHours(hour); else newDate.setHours(hour);
        setSelectedDate(newDate)
        props.setValue(newDate);
    }
    function setMinutes(minute: number) {
        let newDate = new Date(selectedDate);
        if (selectedTimezone === "utc") newDate.setUTCMinutes(minute); else newDate.setMinutes(minute);
        setSelectedDate(newDate)
        props.setValue(newDate);
    }

    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const start = -(new Date(selectedYear, selectedMonth, 1).getDay()) + 1;
    const end = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const years = arrayFromTo(selectedYear - 20, selectedYear + 20);

    return <div className="NuoCalendar">
        <div className="NuoCalendarDate">
            <div className="NuoRow">
                <div className="NuoCalendarMonthYear">
                    <select className="NuoCalendarMonth" value={String(selectedMonth)} onChange={(event) => {
                        setSelectedMonth(parseInt(event.currentTarget.value));
                    }}>
                        {months.map((month, monthIndex) => {
                            return <option key={String(monthIndex)} value={String(monthIndex)}>{t("calendar.month." + month)}</option>;
                        })}
                    </select>
                    <select className="NuoCalendarYear" value={String(selectedYear)} onChange={(event) => {
                        setSelectedYear(parseInt(event.currentTarget.value));
                    }}>
                        {years.map((year) => {
                            return <option key={String(year)} value={String(year)}>{year}</option>;
                        })}
                    </select>
                </div>
                <div className="NuoCalendarPrevNext">
                    <div className="NuoCalendarCell" onClick={() => {
                        if (selectedMonth === 0) {
                            setSelectedMonth(11);
                            setSelectedYear(selectedYear - 1);
                        }
                        else {
                            setSelectedMonth(selectedMonth - 1);
                        }
                    }}>&lt;</div>
                    <div className="NuoCalendarCell" onClick={() => {
                        if (selectedMonth === 11) {
                            setSelectedMonth(0);
                            setSelectedYear(selectedYear + 1);
                        }
                        else {
                            setSelectedMonth(selectedMonth + 1);
                        }
                    }}>&gt;</div>
                </div>
            </div>
            <div className="NuoCalendarWeekdays">
                {weekdays.map(weekday => (
                    <div key={weekday} className="NuoCalendarCellHeader">{props.t("calendar.dayOfWeek." + weekday).charAt(0)}</div>))}
            </div>
            {[0, 1, 2, 3, 4, 5].map(row => {
                return <div key={row} className="NuoRow">{weekdays.map((weekday, weekdayIndex) => {
                    const index = start + row * 7 + weekdayIndex;
                    if (index < 1 || index > end) {
                        return <div key={weekdayIndex} className="NuoCalendarCell"></div>;
                    }
                    else {
                        let className = "NuoCalendarCell";
                        if (getYear() === selectedYear && getMonth() === selectedMonth && index === getDate()) {
                            className = "NuoCalendarCellSelected";
                        }
                        return <div key={weekdayIndex} className={className} onClick={() => {
                            let newDate: Date;
                            if (selectedTimezone === "utc") {
                                newDate = new Date(Date.UTC(selectedYear, selectedMonth, index, getHours(), getMinutes()));
                            }
                            else {
                                newDate = new Date(selectedYear, selectedMonth, index, getHours(), getMinutes());
                            }
                            setSelectedDate(newDate);
                            props.setValue(newDate)
                        }}>{index}</div>;
                    }
                })
                }</div>
            })}
        </div>
        <div className="NuoCalendarTime">
            <label>{t("calendar.timezone")}</label>
            <select value={selectedTimezone} onChange={(event) => {
                setSelectedTimezone(event.currentTarget.value);
            }}>
                <option value="utc">{t("calendar.timezone.utc")}</option>
                <option value="local">{t("calendar.timezone.local")}</option>
            </select>
            <label>{t("calendar.time")}</label>
            <div>
                <select value={getHours() % 12} onChange={(event) => {
                    setHours(getHours() - (getHours() % 12) + parseInt(event.currentTarget.value));
                }}>
                    {arrayFromTo(1, 12).map(hour => <option key={hour} value={hour % 12}>{twoDigits(hour)}</option>)}
                </select>:
                <select value={getMinutes()} onChange={(event) => {
                    setMinutes(parseInt(event.currentTarget.value));
                }}>
                    {arrayFromTo(0, 59).map(minute => <option key={minute} value={String(minute)}>{twoDigits(minute)}</option>)}
                </select>
                <select value={getHours() < 12 ? "am" : "pm"} onChange={(event) => {
                    if (event.currentTarget.value === "pm") {
                        setHours((getHours() % 12) + 12);
                    }
                    else {
                        setHours(getHours() % 12);
                    }
                }}>
                    <option value="am">{t("calendar.am")}</option>
                    <option value="pm">{t("calendar.pm")}</option>
                </select>
            </div>
        </div>
    </div >;
}

export default function FieldDateTime(props: FieldProps): ReactNode {
    switch (props.op) {
        case "edit": return edit();
        case "view": return view();
        case "validate": return validate();
    }
    /**
     * show Field of type DateTime using the values and schema definition
     * @returns
     */
    function edit(): ReactNode {
        const { prefix, label, values, errors, required, setValues, autoFocus, updateErrors, readonly, parameter, t } = props;
        let value = getValue(values, prefix);
        let editValue = getValue(values, "_" + prefix);
        if (editValue === null) {
            editValue = value === null ? "" : (new Date(value)).toLocaleString();
        }
        let error = (errors && (prefix in errors) && errors[prefix]) || "";
        return <TextField
            key={prefix}
            required={required}
            id={prefix}
            label={label}
            description={parameter.description}
            value={editValue}
            autoFocus={autoFocus}
            error={error}
            icon={<CalendarMonthOutlinedIcon />}
            iconOnClick={async () => {
                let selectedValue: Date = value ? new Date(value) : new Date();
                if ("ok" === await Dialog.okCancel(t("field.label." + prefix), <CalendarPopup value={value} t={props.t} setValue={(newValue: Date) => {
                    selectedValue = newValue;
                }} />, t)) {
                    let v = { ...values };
                    selectedValue.setMilliseconds(0);
                    setValue(v, prefix, selectedValue.toISOString().replaceAll(".000Z", "Z"));
                    setValue(v, "_" + prefix);
                    updateErrors(prefix, null);
                    setValues(v);
                }
            }}
            onChange={({ currentTarget: input }) => {
                let v = { ...values };
                setValue(v, "_" + prefix, input.value);
                setValues(v);
            }}
            onBlur={() => {
                let v = { ...values };
                if (editValue === "") {
                    setValue(v, prefix, null);
                    setValue(v, "_" + prefix, null);
                }
                else {
                    const date = new Date(editValue);
                    if (isNaN(date.getTime())) {
                        updateErrors(prefix, "Field \"" + prefix + "\" has invalid date/time value");
                        return;
                    }
                    setValue(v, prefix, date.toISOString().replaceAll(".000Z", "Z"));
                    setValue(v, "_" + prefix);
                }
                updateErrors(prefix, null);
                setValues(v);
            }}
            disabled={readonly}
        />
    }

    /** validates if field is in correct format
     * There are two fields in the "values" object - "<prefix>" and "_<prefix>".
     * The "<prefix>" field contains the value in the data store which will be sent to the server.
     * The "_<prefix>" field stores temporarily the entered value and will be cleared when exiting
     *    the field and the field is in the correct date/time format.
     */
    function validate(): boolean {
        const { prefix, values, updateErrors } = props;
        let editValue = getValue(values, "_" + prefix);
        if (editValue !== null) {
            updateErrors(prefix, "Field \"" + prefix + "\" has invalid date/time format");
            return false;
        }
        return FieldBase_validate(props);
    }

    function view(): ReactNode {
        const value = String(FieldBase_display(props));
        if (!value) {
            return value;
        }

        let date = new Date(value);
        if (!isNaN(date.getTime())) {
            return date.toLocaleString();
        }
        return value;
    }
}