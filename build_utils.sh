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
AWS_DOCKER_IMAGE_SHA="${AWS_DOCKER_IMAGE_RELEASE}-${GIT_HASH}"

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
function doesImageExist() {
    FIRST_LINE="$(docker manifest inspect $1 2>&1 | head -1)"
    if [ $? -eq 0 ] && [ "${FIRST_LINE}" == "{" ] ; then
        echo "yes"
    elif [[ "${FIRST_LINE}" == 'no such manifest'* ]] || [[ "${FIRST_LINE}" == 'manifest unknown'* ]]; then
        echo "no"
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

# creates helm package with VERSION-GIT_HASH tag
function createHelmPackage() {
    mkdir -p build
    rm -rf build/charts
    cp -r charts build/
    if [ ! -z ${RELEASE_BRANCH_VERSION} ] ; then
        if [ "${RELEASE_BRANCH_MAJOR_MINOR}" != "${VERSION}" ] ; then
            fail "Helm Chart version ${VERSION} must match with major/minor version of branch name ${RELEASE_BRANCH_MAJOR_MINOR}"
        fi
    elif [ "${BRANCH}" != "main" ] ; then
        echo "Not a main or rel/* branch - ${BRANCH} - not publishing chart"
        return 0
    fi

    SNAPSHOT="${VERSION}-${GIT_HASH}"
    echo "Applying \"${SNAPSHOT}\" to Helm Chart"
    cat ${CHART_FILE} | sed "s/^version: .*/version: \"${SNAPSHOT}\"/g" | sed "s/^appVersion: .*/appVersion: \"${SNAPSHOT}\"/g" > build/${CHART_FILE}
    (cd build/charts && helm package ${REPOSITORY})

    echo "Create tgz file from static files"
    mkdir -p build/static_files
    docker run nuodbaas-webui tgz_static > build/static_files/${REPOSITORY}-html-${SNAPSHOT}.tgz
}

function uploadHelmPackage() {
    if [ "$(ls build/charts/*.tgz 2> /dev/null)" == "" ] ; then
        echo "No Helm chart generated."
        return 0
    fi

    helm push build/charts/nuodbaas-webui-*.tgz "oci://${ECR_ACCOUNT_URL}"

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

    if [ -d build/static_files ] ; then
        mv build/static_files/*.tgz ./
    fi

    git add *.tgz
    git commit -m "${COMMIT_MSG}"

    # Push change unless DRY_RUN=true
    if [ "$DRY_RUN" != true ]; then
        git push
    fi

    git checkout -
}

if [ "$1" == "deployDockerImages" ] ; then
    if [ "${BRANCH}" == "main" ]; then
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

            # use this last - the github docker image is used to determine a prior
            # successful build succeeded (to avoid rebuilding and ensuring an identical
            # image when creating a release or when promoting)
            docker tag "${REPOSITORY}:latest" "${GIT_DOCKER_IMAGE_SHA}" && \
            docker push "${GIT_DOCKER_IMAGE_SHA}" && \
            exit 0
        fi
    else
        echo "Docker images are only uploaded from the \"main\" branch."
        exit 0
    fi
fi

if [ "$1" == "doesImageExist" ] ; then
    if [ "${BRANCH}" == "main" ]; then
        doesImageExist ${GIT_DOCKER_IMAGE_SHA}
    else
        echo "no"
    fi
    exit 0
fi

if [ "$1" == "createAndUploadHelmPackage" ] ; then
    # Make sure there are no uncommitted changes
    GIT_STATUS="$(git status --porcelain)"
    [ "$GIT_STATUS" = "" ] || fail "Cannot publish charts with uncommitted changes:\n$GIT_STATUS"

    createHelmPackage && uploadHelmPackage
    exit $?
fi

if [ "$1" == "createRelease" ] && [ "$2" != "" ] ; then
    if [ "$APP_VERSION" != "$VERSION" ] || [ "$APP_VERSION" != "$2" ] ; then
        echo "Versions do not match. Will not create a release"
        echo "appVersion = \"$APP_VERSION\""
        echo "version = \"$VERSION\""
        echo "provided version = \"$2\""
        exit 1
    else
        docker pull "${GIT_DOCKER_IMAGE_SHA}" && \
        docker tag "${GIT_DOCKER_IMAGE_SHA}" "${AWS_DOCKER_IMAGE_RELEASE}" && \
        docker tag "${GIT_DOCKER_IMAGE_SHA}" "${GIT_DOCKER_IMAGE_RELEASE}" && \
        docker push "${AWS_DOCKER_IMAGE_RELEASE}" && \
        docker push "${GIT_DOCKER_IMAGE_RELEASE}" && \
        \
        mkdir -p build && \
        rm -rf build/charts && \
        cp -r charts build/ && \
        (cd build/charts && helm package ${REPOSITORY}) && \
        uploadHelmPackage
        exit $?
    fi
fi

if [ "$1" != "" ] ; then
    echo "Invalid first argument: \"$1\""
fi

echo "$0 doesImageExist"
echo "$0 createAndUploadHelmPackage"
echo "$0 deployDockerImages"
echo "$0 createRelease <version number>"
