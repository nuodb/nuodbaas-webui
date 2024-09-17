#!/bin/sh
# (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

if [ "${NUODB_CP_REST_URL}" != "" ] ; then
    find /usr/share/nginx/html -type f | while read line; do
        sed -i "s#___NUODB_CP_REST_URL___#${NUODB_CP_REST_URL}#g" ${line}
    done
fi

if [ "${NUODBAAS_WEBUI_PATH_PREFIX}" != "" ] ; then
    find /usr/share/nginx/html -type f | while read line; do
        sed -i "s:\"/ui/:\"/${NUODBAAS_WEBUI_PATH_PREFIX}/:g" ${line}
        sed -i "s:\"/ui\":\"/${NUODBAAS_WEBUI_PATH_PREFIX}\":g" ${line}
    done
    mv /usr/share/nginx/html/ui "/usr/share/nginx/html/${NUODBAAS_WEBUI_PATH_PREFIX}"
fi

exec nginx -g "daemon off;"
