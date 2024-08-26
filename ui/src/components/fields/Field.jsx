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

        props.required = get("required");

        let type = get("type")
        if (!type) {
            type = get("schema", "type");
        }

        false && dumpLeftovers();
        if (type === "string") {
            if (props.prefix === "resourceVersion") {
                return new FieldHidden(props);
            }
            else if (props.prefix.toLowerCase().includes("password")) {
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
