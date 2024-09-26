#!/bin/bash
REPOSITORY="nuodbaas-webui"
DOCKER_REGISTRY="ghcr.io/nuodb/${REPOSITORY}"
BRANCH="$(git rev-parse --abbrev-ref HEAD | tr ' ' '_')"
CHART_FILE="charts/${REPOSITORY}/Chart.yaml"
VALUES_FILE="charts/${REPOSITORY}/values.yaml"
APP_VERSION="$(grep '^appVersion:' ${CHART_FILE} | tail -n1 | awk '{ print $2}' | tr -d '"')"
VERSION="$(grep '^version:' ./charts/${REPOSITORY}/Chart.yaml | tail -n1 | awk '{ print $2}' | tr -d '"')"
if [[ ${BRANCH} == rel/* ]] ; then
    RELEASE_BRANCH_VERSION="$(echo "${BRANCH}" | cut -d / -f2)"
    RELEASE_BRANCH_MAJOR_MINOR="$(echo "${RELEASE_BRANCH_VERSION}" | cut -d . -f1,2)"
else
    RELEASE_BRANCH_VERSION=""
    RELEASE_BRANCH_MAJOR_MINOR=""
fi
BRANCH=$(echo $BRANCH | tr -cd '[:alnum:]')
# TIMESTAMP="+$(date +%Y%m%d.%H%M%S)"
TIMESTAMP=""

function fail() {
    printf "$1\n" >&2
    exit 1
}

set -e

# $1 = docker image with tag
function dockerImageExists() {
    FIRST_LINE="$(docker manifest inspect $1 2>&1 | head -1)"
    if [ "${FIRST_LINE}" == "{" ] ; then
        echo "true"
    elif [[ "${FIRST_LINE}" == 'no such manifest'* ]] || [[ "${FIRST_LINE}" == 'manifest unknown'* ]]; then
        echo "false"
    else
        echo "error: ${FIRST_LINE}"
    fi
}

# $1 = Helm Index yaml location
# $2 = Helm chart name
# $2 = Helm chart version
function helmChartExists() {
    YAML_CONTENT="$(curl --fail "$1" 2>&1)"
    if [ $? -eq 0 ] ; then
        if [ "$(echo "$YAML_CONTENT" | grep -e "- $2-$3\.tgz")" != "" ] ; then
            echo "true"
        else
            echo "false"
        fi
    else
        echo "error"
    fi
}

# Returns the docker image location (and tag) based on branch info
if [ "$1" == "getDockerImageTag" ] ; then
    if [ "${BRANCH}" == "master" ] ; then
        # development builds
        echo "${DOCKER_REGISTRY}:${VERSION}${TIMESTAMP}"
    elif [ -z "${RELEASE_BRANCH_VERSION}" ] ; then
        # personal branch
        echo "${DOCKER_REGISTRY}:${BRANCH}"
    else
        # release branch
        DOCKER_IMAGE_EXISTS=$(dockerImageExists ${DOCKER_REGISTRY}:${VERSION})
        if [ "$DOCKER_IMAGE_EXISTS" == "true" ] ; then
            echo "${DOCKER_REGISTRY}:${VERSION}${TIMESTAMP}"
        elif [ "$DOCKER_IMAGE_EXISTS" == "false" ] ; then
            echo "${DOCKER_REGISTRY}:${VERSION}"
        else
            echo "Unable to determine docker image tag: $DOCKER_IMAGE_EXISTS"
            exit 1
        fi
    fi
    exit 0
fi

# creates helm package
# adjusts helm chart version according to branch info with these rules:
# - sets docker repository tag in values.yaml to the value set in Chart.yaml:appVersion
# - sets helm chart version in Chart.yaml:
#   - if master, use VERSION-HASH+TIMESTAMP
#   - if a rel/* branch:
#     - use VERSION if it doesn't exist yet (first release build)
#     - use VERSION-HASH+TIMESTAMP otherwise
#   - otherwise (all personal branches) don't add to chart
if [ "$1" == "createHelmPackage" ] ; then
    mkdir -p build
    rm -rf build/charts
    cp -r charts build/
    echo "Applying \"${DOCKER_REGISTRY}:${APP_VERSION}\" to image repository"
    cat ${VALUES_FILE} | sed "s%  repository: .*%  repository: ${DOCKER_REGISTRY}:${APP_VERSION}%g" > build/${VALUES_FILE}
    HELM_HASH=$(grep -r -n -e ^ charts | sort | shasum -a 256 | cut -b -32 | xxd -r -p | base64 | tr -d '/+=')
    if [ ! -z ${RELEASE_BRANCH_VERSION} ] ; then
        if [ "${RELEASE_BRANCH_MAJOR_MINOR}" != "${VERSION}" ] ; then
            echo "Helm Chart version ${VERSION} must match with major/minor version of branch name ${RELEASE_BRANCH_MAJOR_MINOR}"
            exit 1
        fi

        HELM_CHART_EXISTS="$(helmChartExists https://nuodb.github.io/${REPOSITORY}/index.yaml ${REPOSITORY} ${VERSION})"
        if [ "${HELM_CHART_EXISTS}" == "true" ] ; then
            echo "Helm chart with version ${VERSION} exists. Updating with hash"
            SNAPSHOT="${VERSION}-${HELM_HASH}${TIMESTAMP}"
        elif [ "${HELM_CHART_EXISTS}" == "false" ] ; then
            echo "This is the first build with a non-existing helm chart. Publishing chart..."
            SNAPSHOT="${VERSION}"
        else
            echo "Error occurred: $HELM_CHART_EXISTS"
            exit 1
        fi
    elif [ "${BRANCH}" == "master" ] ; then
        SNAPSHOT="${VERSION}-${HELM_HASH}${TIMESTAMP}"
    else
        echo "Personal branch - not publishing chart"
        exit 0
    fi

    echo "Applying \"${SNAPSHOT}\" to Helm Chart"
    cat ${CHART_FILE} | sed "s/^version: .*/version: \"${SNAPSHOT}\"/g" > build/${CHART_FILE}
    (cd build/charts && helm package ${REPOSITORY})
    exit 0
fi

if [ "$1" == "uploadHelmPackage" ] ; then
    if [ "$(ls build/charts/*.tgz 2> /dev/null)" == "" ] ; then
        echo "No Helm chart generated."
        exit 0
    fi

    # Make sure there are no uncommitted changes
    GIT_STATUS="$(git status --porcelain)"
    [ "$GIT_STATUS" = "" ] || fail "Cannot publish charts with uncommitted changes:\n$GIT_STATUS"

    # Checkout gh-pages and fast forward to origin
    git checkout gh-pages
    git merge --ff-only origin/gh-pages

    # Check if chart exists already (ignoring +* build timestamp)
    mkdir -p charts
    NEW_CHART="$(cd build/charts && ls *.tgz | sed "s/\.tgz$//g" | sed "s/\+.*//g")"
    EXISTING_CHARTS="$(ls *.tgz | sed "s/\.tgz$//g" | sed "s/\+.*//g")"
    if [ "$(echo "${EXISTING_CHARTS}" | grep -e "^${NEW_CHART}$")" != "" ] ; then
        echo "Chart exists already - not updating"
        git checkout -
        exit 0
    else
        echo "Updating index with chart ${NEW_CHART}"

        # Update index with new Helm charts
        mv build/charts/*.tgz ./
        helm repo index .

        git add index.yaml *.tgz
        git commit -m "Add chart ${NEW_CHART} to index"

        # Push change unless DRY_RUN=true
        if [ "$DRY_RUN" != true ]; then
            git push
        fi
    fi

    git checkout -
    exit 0
fi

echo "$0 getDockerImageTag"
echo "$0 createHelmPackage"
echo "$0 uploadHelmPackage"
