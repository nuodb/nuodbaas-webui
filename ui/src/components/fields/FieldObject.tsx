import React, { ReactNode } from "react";
import FieldBase from "./FieldBase";
import FieldFactory from "./FieldFactory";
import { getDefaultValue } from "../../utils/schema";
import { setValue, getValue } from "./utils";
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

export default class FieldObject extends FieldBase {

    /**
     * show Field of type Object using the values and schema definition
     * @param prefix - contains field name (hierarchical fields are separated by period)
     * @param parameter - schema definition for this field
     * @param values - contains object with ALL values (and field names) of this form (not just this field).
     *                 the key is the field name (name is separated by period if the field is hierarchical)
     * @param errors - contains object with ALL errors (and field names) of this form (not just this field).
     *                 the key is the field name (name is separated by period if the field is hierarchical)
     * @param required
     * @param setValues - callback to update field value
     * @returns
     */
    show() {
        const { prefix, parameter, values, expand, hideTitle } = this.props;
        let ret = Object.keys(parameter).map(key => {
            let prefixKey = prefix ? (prefix + "." + key) : key;
            let defaultValue = getDefaultValue(parameter[key], values && getValue(values, prefixKey));
            if (defaultValue !== null) {
                setValue(values, prefixKey, defaultValue);
            }
            return <div key={key} className="gap">{(FieldFactory.create({ ...this.props, prefix: prefixKey, parameter: parameter[key], expand: false })).show()}</div>
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
        const { prefix, parameter, values } = this.props;
        const value = values[prefix];
        let success = true;
        if (parameter && value) {
            // validate objects (hierarchical fields)
            Object.keys(value).forEach(subKey => {
                const field = FieldFactory.create({ ...this.props, prefix: prefix + "." + subKey, parameter: parameter[subKey] });
                success = field.validate() && success;
            });
        }
        return success;
    }

    getDisplayValue(): ReactNode {
        const { prefix, parameter } = this.props;
        return <dl className="map">
            {Object.keys(parameter).map(key => {
                const prefixKey = prefix ? (prefix + "." + key) : key;
                const field = FieldFactory.create({ ...this.props, prefix: prefixKey, parameter: parameter[key] });
                return <div key={key}><dt>{String(key)}</dt><dd>{field.getDisplayValue()}</dd></div>;
            })}
        </dl>
    }
}