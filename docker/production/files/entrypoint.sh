#!/bin/sh
if [ "$1" != "" ] ; then
    exec "$@"
else
    exec /ui-server
fi
