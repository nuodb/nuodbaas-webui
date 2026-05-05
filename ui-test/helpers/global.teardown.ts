// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.

import { test } from '@playwright/test';
const fs = require('fs');
const MCR = require('monocart-coverage-reports');
const { Readable } = require('stream');
const { finished } = require('stream/promises');

test.describe('global teardown', () => {
  test('teardown coverage', async () => {
    const mcr = MCR({
        name: 'Coverage Report',
        outputDir: './target/coverage-reports',
        reports: ["v8", "console-details"],
        cleanCache: true,
        all: './src',
        entryFilter: {
            '**/node_modules/**': false,
            '**/*': true
        },
        sourceFilter: {
            '**/node_modules/**': false,
            '**/src/**': true
        },
    });
    const files = fs.readdirSync("target/coverage-data");
    for(let f=0; f<files.length; f++) {
        const file = files[f];
        if(!file.endsWith(".map")) {
            console.log("Loading coverage data from " + file);
            const coverage = JSON.parse(fs.readFileSync("target/coverage-data/" + file, "utf8"));
            for(let i=0; i<coverage.length; i++) {
                const cov = coverage[i];
                if(cov && cov.url) {
                    const urlParts = cov.url.split("/");
                    const destFile = "target/" + urlParts[urlParts.length-1] + ".map";
                    if(!fs.existsSync(destFile)) {
                        const res = await fetch(cov.url.replace(":8089", "") + ".map");
                        if (res.ok) {
                            const fileStream = fs.createWriteStream(destFile, { flags: 'wx' });
                            await finished(Readable.fromWeb(res.body).pipe(fileStream));
                        }
                        else {
                            console.log("Unable to download map file from " + cov.url);
                        }
                    }
                }
            }
            await mcr.add(coverage);
        }
    }
    await mcr.generate();
  });
});