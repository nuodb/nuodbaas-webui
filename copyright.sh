#!/bin/bash
# (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

echo "Checking copyrights..."
UNCOMMITTED_FILES="$(git diff --name-only --cached)$(git diff --name-only)"
FAIL=false
while read FILE; do
    FILE=$(echo "$FILE" | sed "s/\.\///g")
    CREATED_YEAR=$(git log --follow --format=%ci --date default "$FILE" | tail -1 | cut -b -4)
    if [ "$CREATED_YEAR" == "" ] ; then
        CREATED_YEAR=$(date +%Y)
    fi
    if [[ $UNCOMMITTED_FILES == *"$FILE"* ]] ; then
        MODIFIED_YEAR=$(date +%Y)
    else
        MODIFIED_YEAR=$(git log --follow --format=%ci --date default "$FILE" | head -1 | cut -b -4)
    fi
    if [ "$MODIFIED_YEAR" == "" ] ; then
        MODIFIED_YEAR=$(date +%Y)
    fi
    if [ "$CREATED_YEAR" == "$MODIFIED_YEAR" ] ; then
        YEARS="$CREATED_YEAR"
    else
        YEARS="$CREATED_YEAR-$MODIFIED_YEAR"
    fi
    COPYRIGHT="(C) Copyright $YEARS Dassault Systemes SE.  All Rights Reserved."
    grep -q "$FILE" -e "$COPYRIGHT"
    if [ $? -eq 0 ]; then
        true
    else
        echo "No copyright or no valid copyright for $FILE ($YEARS)"
        FAIL=true
    fi
done < <(find ./ -type f | grep -v -f copyright_ignore.txt)

if [ "$FAIL" == "true" ] ; then
    exit 1
fi