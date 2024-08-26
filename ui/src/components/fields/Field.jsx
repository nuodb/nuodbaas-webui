import FieldString from "./FieldString";
import FieldHidden from "./FieldHidden";
import FieldPassword from "./FieldPassword";
import FieldBoolean from "./FieldBoolean";
import FieldObject from "./FieldObject";
import FieldMap from "./FieldMap";
import FieldArray from "./FieldArray";
import FieldInteger from "./FieldInteger";
import FieldMessage from "./FieldMessage";

export default class Field {
    constructor(props) {
        this.props = props;
    }

    /**
     * show one Field of any type using the values and schema definition
     * @param prefix - contains field name (hierarchical fields are separated by period)
     * @param parameter - schema definition for this field
     * @param values - contains object with ALL values (and field names) of this form (not just this field).
     *                 the key is the field name (name is separated by period if the field is hierarchical)
     * @param setValues - callback to update field values
     * @returns
     */
    show() {
        return this.getField().show();
    }

    getField() {
        let leftOvers = JSON.parse(JSON.stringify(this.props.parameter));
        if (!("schema" in leftOvers)) {
            leftOvers["schema"] = {};
        }

        function get(key1, key2) {
            if (!key2) {
                let ret = leftOvers[key1];
                delete leftOvers[key1];
                return ret;
            }
            else {
                let ret = leftOvers[key1][key2];
                delete leftOvers[key1][key2];
                return ret;
            }
        }

        function dumpLeftovers() {
            if (Object.keys(leftOvers["schema"]).length === 0) {
                delete leftOvers["schema"];
            }
            if (Object.keys(leftOvers).length > 0) {
                console.log("LEFTOVERS", leftOvers);
            }
        }

        let in_ = get("in");
        if (in_ && in_ !== "path" && in_ !== "query") {
            throw new Error("Invalid IN value " + in_);
        }

        this.props.required = get("required");

        let type = get("type")
        if (!type) {
            type = get("schema", "type");
        }

        false && dumpLeftovers();
        if (type === "string") {
            if (this.props.prefix === "resourceVersion") {
                return new FieldHidden(this.props);
            }
            else if (this.props.prefix.toLowerCase().includes("password")) {
                return new FieldPassword(this.props);
            }
            else {
                return new FieldString(this.props);
            }
        }
        else if (type === "boolean") {
            return new FieldBoolean(this.props);
        }
        else if (type === "object") {
            if (this.props.parameter["properties"]) {
                let p = { ...this.props, parameter: this.props.parameter["properties"] };
                return new FieldObject(p);
            }
            else if (this.props.parameter["additionalProperties"]) {
                let p = { ...this.props, parameter: this.props.parameter["additionalProperties"] };
                return new FieldMap(p);
            }
            else {
                console.log("ERROR: Invalid object", this.props.prefix, this.props.parameter);
                if (process && process.env && process.env.NODE_ENV === "development") {
                    return new FieldMessage({ message: "ERROR: Invalid object" });
                }
                else {
                    return null;
                }
            }
        }
        else if (type === "array") {
            return new FieldArray(this.props);
        }
        else if (type === "integer") {
            return new FieldInteger(this.props);
        }
        else {
            return new FieldMessage({ message: "Invalid type " + String(type) + " " + JSON.stringify(this.props.parameter) + " " + JSON.stringify(leftOvers) });
        }
    }
}