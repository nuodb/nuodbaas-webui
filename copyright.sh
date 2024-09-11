#!/bin/bash
# (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

find ./ -type f | grep -v -f copyright_ignore.txt | while read file; do
    grep -q "$file" -e "(C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved."
    if [ $? -eq 0 ]; then
        true
    else
        echo "No copyright for $file"
    fi
done
