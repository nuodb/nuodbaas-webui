import FieldString from "./FieldString";
import FieldHidden from "./FieldHidden";
import FieldPassword from "./FieldPassword";
import FieldBoolean from "./FieldBoolean";
import FieldObject from "./FieldObject";
import FieldMap from "./FieldMap";
import FieldArray from "./FieldArray";
import FieldInteger from "./FieldInteger";
import FieldMessage from "./FieldMessage";
import FieldDateTime from "./FieldDateTime";

/** Factory class to create components based on the field type */
export default class FieldFactory {
    static create(props) {
        props = { ...props };
        let leftOvers = JSON.parse(JSON.stringify(props.parameter));
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

        let in_ = get("in");
        if (in_ && in_ !== "path" && in_ !== "query") {
            throw new Error("Invalid IN value " + in_);
        }

        props.required = get("required");

        let format = get("format");
        let type = get("type")
        if (!type) {
            type = get("schema", "type");
            format = get("schema", "format");
        }

        if (type === "string" && format === "date-time") {
            return new FieldDateTime(props);
        }
        else if (type === "string") {
            if (props.prefix === "resourceVersion") {
                return new FieldHidden(props);
            }
            else if (props.parameter["x-tf-sensitive"] === true) {
                return new FieldPassword(props);
            }
            else {
                return new FieldString(props);
            }
        }
        else if (type === "boolean") {
            return new FieldBoolean(props);
        }
        else if (type === "object") {
            if (props.parameter["properties"]) {
                props.parameter = props.parameter["properties"];
                return new FieldObject(props);
            }
            else if (props.parameter["additionalProperties"]) {
                return new FieldMap(props);
            }
            else {
                console.log("ERROR: Invalid object", props.prefix, props.parameter);
                if (process && process.env && process.env.NODE_ENV === "development") {
                    return new FieldMessage({ message: "ERROR: Invalid object" });
                }
                else {
                    return null;
                }
            }
        }
        else if (type === "array") {
            return new FieldArray(props);
        }
        else if (type === "integer") {
            return new FieldInteger(props);
        }
        else {
            return new FieldMessage({ message: "Invalid type " + String(type) + " " + JSON.stringify(props.parameter) + " " + JSON.stringify(leftOvers) });
        }
    }
}
