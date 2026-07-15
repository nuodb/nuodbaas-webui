#!/bin/sh
# (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved.

if [ "$1" == "tgz_static" ] ; then
    echo "Extract static files from image" 1>&2
    cd /usr/share/nginx/html
    tar -czf - -C /usr/share/nginx/html *
    exit $?
fi

if [ "${NUODB_CP_REST_URL}" == "" ] ; then
    NUODB_CP_REST_URL=/nuodb-cp
fi
if [ "${NUODB_SQL_REST_URL}" == "" ] ; then
    NUODB_SQL_REST_URL=/api/sql
fi
if [ "${NUODB_MULTI_INSTANCE_NAME}" == "" ] ; then
    NUODB_MULTI_INSTANCE_NAME=$(echo $NUODBAAS_WEBUI_HOSTS | awk -F , ' { print $1 } ')
fi
if [ "${NUODB_MULTI_INSTANCE_JSON}" != "" ] ; then
    sed -i "s#___NUODB_MULTI_INSTANCE_URL___#/ui/multiinstance.json#g" /usr/share/nginx/html/ui/config.json
    echo "${NUODB_MULTI_INSTANCE_JSON}" > /usr/share/nginx/html/ui/multiinstance.json
fi
find /usr/share/nginx/html -type f ! -name "custom.json" | while read line; do
    sed -i "s#___NUODB_CP_REST_URL___#${NUODB_CP_REST_URL}#g" ${line}
    sed -i "s#___NUODB_SQL_REST_URL___#${NUODB_SQL_REST_URL}#g" ${line}
    sed -i "s#___NUODB_MULTI_INSTANCE_URL___#${NUODB_MULTI_INSTANCE_URL}#g" ${line}
    sed -i "s#___NUODB_MULTI_INSTANCE_NAME___#${NUODB_MULTI_INSTANCE_NAME}#g" ${line}
done

if [ -f /usr/share/nginx/html/theme/custom.json ] ; then
    cp /usr/share/nginx/html/theme/custom.json /usr/share/nginx/html/ui/theme/custom.json
fi

if [ "${NUODBAAS_WEBUI_PATH_PREFIX}" = "" ] ; then
    NUODBAAS_WEBUI_PATH_PREFIX=ui
fi
if [ "${NUODBAAS_WEBUI_PATH_REFIX}" != "/ui" ] ; then
    find /usr/share/nginx/html -type f | while read line; do
        sed "s:\"/ui/:\"/${NUODBAAS_WEBUI_PATH_PREFIX}/:g" "${line}" \
            | sed "s:\"/ui\":\"/${NUODBAAS_WEBUI_PATH_PREFIX}\":g" > "${line}.tmp" \
            && mv "${line}.tmp" "${line}"
    done
    mv /usr/share/nginx/html/ui "/usr/share/nginx/html/${NUODBAAS_WEBUI_PATH_PREFIX}"
fi

if [ "${NUODBAAS_WEBUI_PATH_PREFIX_ALTERNATE}" != "" ] ; then
    find /usr/share/nginx/html -type f | while read line; do
        sed "s:\"/webui/:\"/${NUODBAAS_WEBUI_PATH_PREFIX_ALTERNATE}/:g" "${line}" \
            | sed -i "s:\"/webui\":\"/${NUODBAAS_WEBUI_PATH_PREFIX_ALTERNATE}\":g" > "${line}.tmp" \
            && mv "${line}.tmp" "${line}"
    done
fi

updateDirectoryServer() {
    if [ "$NUODB_MULTI_INSTANCE_URL" != "" ] && [ "$NUODB_MULTI_INSTANCE_NAME" != "" ] && [ "$NUODB_MULTI_INSTANCE_USERNAME" != "" ] && [ "$NUODB_MULTI_INSTANCE_PASSWORD" != "" ] ; then
        while [ true ] ; do
            curl -X POST "$NUODB_MULTI_INSTANCE_URL" -u "$NUODB_MULTI_INSTANCE_USERNAME:$NUODB_MULTI_INSTANCE_PASSWORD" --data-binary @/usr/share/nginx/html/${NUODBAAS_WEBUI_PATH_PREFIX}/config.json
            sleep 300
        done
    fi
}

updateDirectoryServer &

exec nginx -g "daemon off;"
