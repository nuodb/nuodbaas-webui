#!/bin/sh

if [ "${NUODB_CP_REST_PATH_PREFIX}" != "" ] ; then
    find /usr/share/nginx/html -type f | while read line; do
        sed -i "s:___NUODB_CP_REST_PATH_PREFIX___:${NUODB_CP_REST_PATH_PREFIX}:g" ${line}
    done
fi

exec nginx -g "daemon off;"
