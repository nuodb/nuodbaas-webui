/**
 * gets a value from a field. If not found, returns null.
 * @param {*} values object containing possibly hierarchical fields
 * @param {*} prefix field name. Hierarchical fields are separated by a period.
 * @returns
 */
export function getValue(values, prefix) {
    let value = values;
    let parts = prefix.split(".");
    for(let i=0; i<parts.length; i++) {
        value = value[parts[i]];
        if(value === undefined || value === null) {
            return null;
        }
    }
    if(value === undefined) {
        return null;
    }
    return value;
}

/**
 * sets a field value. Removes field if value is null or undefined.
 * @param {*} values object containing possibly hierarchical fields
 * @param {*} prefix field name. Hierarchical fields are separated by a period.
 * @param {*} value value to assign. Deletes field if value is undefined or null.
 */
export function setValue(values, prefix, value) {
    let parts = prefix.split(".");
    let values_ = values;
    for(let i=0; i<parts.length-1; i++) {
        if(!values_[parts[i]]) {
            if(value === null || value === undefined) {
                return;
            }
            values_[parts[i]] = {};
        }
        values_ = values_[parts[i]];
    }
    if(value === null || value === undefined) {
        delete values_[parts[parts.length-1]];
    }
    else {
        values_[parts[parts.length-1]] = value;
    }
}
