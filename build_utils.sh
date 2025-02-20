#!/bin/bash
# (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.
REPOSITORY="nuodbaas-webui"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
CHART_FILE="charts/${REPOSITORY}/Chart.yaml"
VALUES_FILE="charts/${REPOSITORY}/values.yaml"
APP_VERSION="$(sed -n -E 's/^appVersion: *"?([^ "]*)"?.*/\1/p' "$CHART_FILE")"
VERSION="$(sed -n -E 's/^version: *"?([^ "]*)"?.*/\1/p' "$CHART_FILE")"
GIT_HASH="$(git rev-parse --short HEAD)"
GIT_DOCKER_IMAGE_RELEASE="ghcr.io/nuodb/${REPOSITORY}:${VERSION}"
GIT_DOCKER_IMAGE_SHA="${GIT_DOCKER_IMAGE_RELEASE}-${GIT_HASH}"
AWS_DOCKER_IMAGE_RELEASE="${ECR_ACCOUNT_URL}/${REPOSITORY}-docker:${VERSION}"
AWS_DOCKER_IMAGE_SHA="${AWS_DOCKER_RELEASE}-${GIT_HASH}"

if [[ "${BRANCH}" == rel/* ]] ; then
    RELEASE_BRANCH_VERSION="$(echo "${BRANCH}" | cut -d / -f2)"
    RELEASE_BRANCH_MAJOR_MINOR="$(echo "${RELEASE_BRANCH_VERSION}" | cut -d . -f1,2)"
else
    RELEASE_BRANCH_VERSION=""
    RELEASE_BRANCH_MAJOR_MINOR=""
fi

function fail() {
    printf "ERROR: $1\n" >&2
    exit 1
}

set -e

# $1 = docker image with tag
function dockerImageExists() {
    FIRST_LINE="$(docker manifest inspect $1 2>&1 | head -1)"
    if [ $? -eq 0 ] && [ "${FIRST_LINE}" == "{" ] ; then
        return 0
    elif [[ "${FIRST_LINE}" == 'no such manifest'* ]] || [[ "${FIRST_LINE}" == 'manifest unknown'* ]]; then
        return 1
    else
        fail "Unable to check if Docker Image $1 exists: ${FIRST_LINE}"
    fi
}

# $1 = Helm Index yaml location
# $2 = Helm chart name
# $3 = Helm chart version
function helmChartExists() {
    YAML_CONTENT="$(curl -sL --fail "$1" 2>&1)"
    if [ $? -eq 0 ] ; then
        if [ "$(echo "$YAML_CONTENT" | grep -e "\.tgz" | grep -e "- $2-$3\.tgz" -e "- $2-$3+")" != "" ] ; then
            return 0
        else
            return 1
        fi
    else
        fail "Unable to determine if Helm chart exists: $1 $2 $3"
    fi
}

# creates helm package
# adjusts helm chart version according to branch info with these rules:
# - sets docker repository tag in values.yaml to the value set in Chart.yaml:appVersion
# - sets helm chart version in Chart.yaml:
#   - if main, use VERSION-HELM_HASH+GIT_HASH
#   - if a rel/* branch:
#     - use VERSION if it doesn't exist yet (first release build)
#     - use VERSION-HELM_HASH+GIT_HASH otherwise
#   - otherwise (all personal branches) don't add to chart
function createHelmPackage() {
    mkdir -p build
    rm -rf build/charts
    cp -r charts build/
    HELM_HASH=$(grep -r -n -e ^ charts | sort | shasum -a 256 | cut -b -32 | xxd -r -p | base64 | tr -d '/+=')
    if [ ! -z ${RELEASE_BRANCH_VERSION} ] ; then
        if [ "${RELEASE_BRANCH_MAJOR_MINOR}" != "${VERSION}" ] ; then
            fail "Helm Chart version ${VERSION} must match with major/minor version of branch name ${RELEASE_BRANCH_MAJOR_MINOR}"
        fi

        if helmChartExists https://nuodb.github.io/${REPOSITORY}/index.yaml ${REPOSITORY} ${VERSION} ; then
            echo "Helm chart with version ${VERSION} exists. Updating with hash"
            SNAPSHOT="${VERSION}-${HELM_HASH}+${GIT_HASH}"
        else
            echo "This is the first build with a non-existing helm chart. Publishing chart..."
            SNAPSHOT="${VERSION}"
        fi
    elif [ "${BRANCH}" == "main" ] || [ "${BRANCH}" == "agr22/COPYRIGHT" ]; then
        SNAPSHOT="${VERSION}-${HELM_HASH}+${GIT_HASH}"
    else
        echo "Personal branch ${BRANCH} - not publishing chart"
        exit 0
    fi

    echo "Applying \"${SNAPSHOT}\" and \"${VERSION}-latest\" to Helm Chart"
    cat ${CHART_FILE} | sed "s/^version: .*/version: \"${SNAPSHOT}\"/g" > build/${CHART_FILE}
    (cd build/charts && helm package ${REPOSITORY})
    cat ${CHART_FILE} | sed "s/^version: .*/version: \"${VERSION}-latest\"/g" > build/${CHART_FILE}
    (cd build/charts && helm package ${REPOSITORY})

    echo "Create tgz file from static files"
    mkdir -p build/static_files
    docker run nuodbaas-webui tgz_static > build/static_files/${REPOSITORY}-html-${SNAPSHOT}.tgz
    cp build/static_files/${REPOSITORY}-html-${SNAPSHOT}.tgz build/static_files/${REPOSITORY}-html-${VERSION}-latest.tgz
    exit 0
}

function uploadHelmPackage() {
    if [ "$(ls build/charts/*.tgz 2> /dev/null)" == "" ] ; then
        echo "No Helm chart generated."
        exit 0
    fi

    helm push nuodbaas-webui-*.tgz "oci://${ECR_ACCOUNT_URL}/"

    # Checkout gh-pages and fast forward to origin
    git checkout gh-pages
    git merge --ff-only origin/gh-pages

    # Check if chart exists already (ignoring +* git hash)
    mkdir -p charts
    NEW_CHART="$(cd build/charts && ls *.tgz | grep -v -e "-latest" | sed "s/\.tgz$//g" | sed "s/\+.*//g")"
    EXISTING_CHARTS="$(ls *.tgz | grep -v -e "-latest" | sed "s/\.tgz$//g" | sed "s/\+.*//g")"
    if [ "$(echo "${EXISTING_CHARTS}" | grep -e "^${NEW_CHART}$")" != "" ] ; then
        echo "Chart exists already - not updating"
        COMMIT_MSG="Add static file `ls static_files/*.tgz | grep -v -e "latest" | sed "s/static_files\///g"`"
    else
        echo "Updating index with chart ${NEW_CHART}"

        # Update index with new Helm charts
        mv build/charts/*.tgz ./
        helm repo index .
        git add index.yaml
        COMMIT_MSG="Add static files + chart ${NEW_CHART} to index"
    fi

    mv build/static_files/*.tgz ./

    git add *.tgz
    git commit -m "${COMMIT_MSG}"

    # Push change unless DRY_RUN=true
    if [ "$DRY_RUN" != true ]; then
        git push
    fi

    git checkout -
    exit 0
}

if [ "$1" == "deployDockerImages" ] ; then
    if [ "${BRANCH}" == "main" ] || [ "${BRANCH}" == "agr22/COPYRIGHT" ]; then
        GIT_STATUS="$(git status --porcelain)"
        if [ "${GIT_STATUS}" != "" ] ; then
            echo "Uncommitted changes in GIT. Will not push to GHCR."
            echo "${GIT_STATUS}"
            exit 1
        else
            docker tag "${REPOSITORY}:latest" "${AWS_DOCKER_IMAGE_SHA}" && \
            docker push "${AWS_DOCKER_IMAGE_SHA}" && \
            docker tag "${REPOSITORY}:latest" "${GIT_DOCKER_IMAGE_SHA}" && \
            docker push "${GIT_DOCKER_IMAGE_SHA}" && \
            exit 0
        fi
    else
        echo "Docker images are only uploaded from the \"main\" branch."
        exit 0
    fi

fi

if [ "$1" == "dockerImageExists" ] ; then
    if [ "${BRANCH}" == "main" ] || [ "${BRANCH}" == "agr22/COPYRIGHT" ]; then
        dockerImageExists ${GIT_DOCKER_IMAGE_SHA}
        exit $?
    fi
    exit 1
fi

if [ "$1" == "createAndUploadHelmPackage" ] ; then
    # Make sure there are no uncommitted changes
    GIT_STATUS="$(git status --porcelain)"
    [ "$GIT_STATUS" = "" ] || fail "Cannot publish charts with uncommitted changes:\n$GIT_STATUS"

    createHelmPackage && uploadHelmPackage
fi

if [ "$1" == "createRelease" ] && [ "$2" != "" ] ; then
    if [ "$APP_VERSION" != "$VERSION" ] || [ "$APP_VERSION" != "$2" ] ; then
        echo "Versions do not match. Will not create a release"
        echo "appVersion = \"$APP_VERSION\""
        echo "version = \"$VERSION\""
        echo "provided version = \"$2\""
        exit 1
    else
        GIT_DOCKER_RELEASE="ghcr.io/nuodb/${REPOSITORY}:${VERSION}"
        AWS_DOCKER_RELEASE="${ECR_ACCOUNT_URL}/${REPOSITORY}-docker:${VERSION}"

        docker pull "${GIT_DOCKER_IMAGE_SHA}" && \
        docker tag "${GIT_DOCKER_IMAGE_SHA}" "${AWS_DOCKER_IMAGE_RELEASE}" && \
        docker tag "${GIT_DOCKER_IMAGE_SHA}" "${GIT_DOCKER_IMAGE_RELEASE}" && \
        docker push "${AWS_DOCKER_IMAGE_RELEASE} && \
        docker push "${GIT_DOCKER_IMAGE_RELEASE} && \
        \
        mkdir -p build && \
        rm -rf build/charts && \
        cp -r charts build/ && \
        (cd build/charts && helm package ${REPOSITORY}) && \
        uploadHelmPackage

    fi
fi

echo "$0 dockerImageExists"
echo "$0 createAndUploadHelmPackage"
echo "$0 deployDockerImages"
echo "$0 createRelease <version number>"
