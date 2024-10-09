// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { evaluate, splitFormulaIntoParts } from './Customizations';

test('Check Formula', () => {
    const data = {
        field: "value",
        fieldWithQuote: "value\"quoted\"",
        parent: {
            child: "childValue"
        }
    }

    // Format: <formula>, <result>,
    const tests = [
        "field", "value",
        "!field", false,
        "field==field", true,
        "fie ld==field", "",
        "field == field", true,
        "field==nofield", false,
        "field!=nofield", true,
        "parent.child", "childValue",
        "field==\"value\"", true,
        "field==\"invalidValue\"", false,
        "\"const\" ==\"const\"", true,
        'fieldWithQuote="value\\"quoted\\""', true,
        "maintenance.isDisabled=false", false,
        "!maintenance", true,
        "!!true", true,
        "!!missingField", false,
        "!!field", true,
        "!!\"string\"", true,
    ]

    for(let i=0; i<tests.length; i+=2) {
        let value = null;
        try {
            value = evaluate(data, tests[i]);
            expect(value).toBe(tests[i+1]);
        }
        catch(ex) {
            console.log("Formula:", tests[i]);
            console.log("  Expected:", tests[i+1]);
            console.log("  Was:", value);
            console.log("  Parts:", splitFormulaIntoParts(tests[i]));
            throw ex;
        }
    }
});
