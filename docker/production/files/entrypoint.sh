#!/bin/sh
# (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved.
if [ "$1" != "" ] ; then
    exec "$@"
else
    exec /ui-server
fi
