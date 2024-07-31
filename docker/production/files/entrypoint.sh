#!/bin/sh

if [ "${NUODB_CP_REST_URL}" != "" ] ; then
    find /usr/share/nginx/html -type f | while read line; do
        sed -i "s:___NUODB_CP_REST_URL___:${NUODB_CP_REST_URL}:g" ${line}
    done
fi

if [ "${NUODB_COCKPIT_PATH_PREFIX}" != "" ] ; then
    find /usr/share/nginx/html -type f | while read line; do
        sed -i "s:\"/ui/:\"/${NUODB_COCKPIT_PATH_PREFIX}/:g" ${line}
        sed -i "s:\"/ui\":\"/${NUODB_COCKPIT_PATH_PREFIX}\":g" ${line}
    done
    mv /usr/share/nginx/html/ui "/usr/share/nginx/html/${NUODB_COCKPIT_PATH_PREFIX}"
fi

exec nginx -g "daemon off;"
