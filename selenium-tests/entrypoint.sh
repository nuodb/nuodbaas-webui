#!/usr/bin/env bash
# (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.
function fail() {
    echo "$1"
    exit 1
}

[[ -z "${URL_BASE}"             ]] && fail "URL_BASE (Web UI URL) not set"
[[ -z "${CP_URL}"               ]] && fail "CP_URL not set (host+directeory to the NuoDB Control Plane)"

[[ -z "${TEST_ORGANIZATION}"    ]] && echo "TEST_ORGANIZATION not set. Will use default value"
[[ -z "${TEST_ADMIN_USER}"      ]] && echo "TEST_ADMIN_USER not set. Will use default value"
[[ -z "${TEST_ADMIN_PASSWORD}"  ]] && echo "TEST_ADMIN_PASSWORD not set. Will use default value"

if ! whoami &>/dev/null; then
  if [ -w /etc/passwd ]; then
    echo "${USER_NAME:-default}:x:$(id -u):0:${USER_NAME:-default} user:${HOME}:/sbin/nologin" >>/etc/passwd
  fi
fi

/usr/bin/supervisord --configuration /etc/supervisord.conf &

cd /test
if [ "${MVN_TEST}" != "" ] ; then
    echo "Running test ${MVN_TEST}"
    mvn -Dtest="${MVN_TEST}" test
else
    echo "Running full test"
    mvn test
fi
