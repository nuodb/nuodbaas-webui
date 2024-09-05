#!/bin/bash
# (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

find ./ -type f | grep -v \
        -e "^\./ui/node_modules/" \
        -e "^\./.git/" \
        -e "^\./selenium-tests/target/" \
        | while read file; do
    grep -q "$file" -e "(C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved."
    if [ $? -eq 0 ]; then
        true
    else
        echo "No copyright for $file"
    fi
done
