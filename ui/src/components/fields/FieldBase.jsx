import { getValue } from "./utils";

export default class FieldBase {
    constructor(props) {
        this.props = props;
    }

    validate(prefix) {
        const { parameter, values, updateErrors } = this.props;
        if (!prefix) {
            prefix = this.props.prefix;
        }

        let value = getValue(values, prefix);
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