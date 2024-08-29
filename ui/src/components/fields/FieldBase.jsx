import { getValue } from "./utils";

export default class FieldBase {
    constructor(props) {
        this.props = props;
    }

    /** validate field and set error state
     * prefix - field name to validate (separated by period on hierarchical fields). Defaults to this.props.prefix
     * parameter - schema definition for this field. Defaults to this.props.parameter
     * value - value to check. if undefined, defaults to the value for "prefix"
     */
    validate(prefix, parameter, value) {
        const { values, updateErrors } = this.props;
        if (!prefix) {
            prefix = this.props.prefix;
        }
        if (!parameter) {
            parameter = this.props.parameter;
        }
        if (value === undefined) {
            value = getValue(values, prefix);
        }

        if (!value) {
            if (parameter.required && !value) {
                updateErrors(prefix, "Field " + prefix + " is required");
                return false;
            }
        }
        else {
            if (parameter.pattern) {
                if (!(new RegExp("^" + parameter.pattern + "$")).test(value)) {
                    updateErrors(prefix, "Field \"" + prefix + "\" must match pattern \"" + parameter.pattern + "\"");
                    return false;
                }
            }
        }
        updateErrors(prefix, null);
        return true;
    }
}