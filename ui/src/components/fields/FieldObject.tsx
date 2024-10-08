// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { ReactNode } from "react";
import FieldBase from "./FieldBase";
import FieldFactory from "./FieldFactory";
import { getDefaultValue } from "../../utils/schema";
import { setValue, getValue } from "./utils";
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import FieldMessage from "./FieldMessage";

export default class FieldObject extends FieldBase {

    /**
     * show Field of type Object using the values and schema definition
     * @returns
     */
    show() {
        const { prefix, parameter, values, errors, required, setValues, updateErrors, expand, hideTitle } = this.props;
        const properties = parameter.properties;
        if (!properties) {
            return new FieldMessage({ ...this.props, message: "\"properties\" attribute missing from schema for field \"" + prefix + "\"" }).show();
        }
        let ret = Object.keys(properties).map(key => {
            let prefixKey = prefix ? (prefix + "." + key) : key;
            let defaultValue = getDefaultValue(properties[key], values && getValue(values, prefixKey));
            if (defaultValue !== null) {
                setValue(values, prefixKey, defaultValue);
            }
            return <div key={key} className="gap">{(FieldFactory.create({ ...this.props, prefix: prefixKey, parameter: properties[key], values, errors, required, setValues, updateErrors, expand: false })).show()}</div>
        });
        if (hideTitle) {
            return ret;
        }
        return <Accordion className="gap" key={prefix} defaultExpanded={!!expand} style={{ gap: "1em" }}>
            <AccordionSummary data-testid={"section-" + prefix} className="FieldObjectSection" expandIcon={<ArrowDropDownIcon />}>{prefix}</AccordionSummary>
            <AccordionDetails className="AccordionDetails">
                {ret}
            </AccordionDetails>
        </Accordion>
    }

    validate() {
        const { prefix, parameter, values, updateErrors } = this.props;
        const properties = parameter.properties;
        const value = values[prefix];
        let success = true;
        if (properties && value) {
            // validate objects (hierarchical fields)
            Object.keys(value).forEach(subKey => {
                const field = FieldFactory.create({ ...this.props, prefix: prefix + "." + subKey, parameter: properties[subKey], values, updateErrors });
                success = field.validate() && success;
            });
        }
        return success;
    }

    getDisplayValue(): ReactNode {
        const { prefix, parameter, values } = this.props;
        const properties = parameter.properties;
        if (!properties) {
            return new FieldMessage({ ...this.props, message: "\"properties\" attribute missing from schema for field \"" + prefix + "\"" }).show();
        }
        return <dl className="map">
            {Object.keys(properties).map(key => {
                const prefixKey = prefix ? (prefix + "." + key) : key;
                const field = FieldFactory.create({ ...this.props, prefix: prefixKey, parameter: properties[key], values });
                return <div key={key}><dt>{String(key)}</dt><dd>{field.getDisplayValue()}</dd></div>;
            })}
        </dl>
    }
}