#!/bin/sh
# (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved.
updateDirectoryServer() {
    if [ "$NUODB_MULTI_INSTANCE_REGISTRY_URL" != "" ] && [ "$NUODB_MULTI_INSTANCE_USERNAME" != "" ] && [ "$NUODB_MULTI_INSTANCE_PASSWORD" != "" ] ; then
        while [ true ] ; do
            curl -X POST "$NUODB_MULTI_INSTANCE_REGISTRY_URL" -u "$NUODB_MULTI_INSTANCE_USERNAME:$NUODB_MULTI_INSTANCE_PASSWORD" --data-binary @/usr/share/nginx/html/${NUODBAAS_WEBUI_PATH_PREFIX}/config.json
            sleep 300
        done
    fi
}

if [ "$1" != "" ] ; then
    exec "$@"
else
    updateDirectoryServer &
    exec /ui-server
fi
