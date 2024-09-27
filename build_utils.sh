#!/bin/bash
REPOSITORY="nuodbaas-webui"
DOCKER_REGISTRY="ghcr.io/nuodb/${REPOSITORY}"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
CHART_FILE="charts/${REPOSITORY}/Chart.yaml"
VALUES_FILE="charts/${REPOSITORY}/values.yaml"
APP_VERSION="$(sed -n -E 's/^appVersion: *"?([^ "]*)"?.*/\1/p' "$CHART_FILE")"
VERSION="$(sed -n -E 's/^version: *"?([^ "]*)"?.*/\1/p' "$CHART_FILE")"
if [[ "${BRANCH}" == rel/* ]] ; then
    RELEASE_BRANCH_VERSION="$(echo "${BRANCH}" | cut -d / -f2)"
    RELEASE_BRANCH_MAJOR_MINOR="$(echo "${RELEASE_BRANCH_VERSION}" | cut -d . -f1,2)"
else
    RELEASE_BRANCH_VERSION=""
    RELEASE_BRANCH_MAJOR_MINOR=""
fi
GIT_HASH="$(git rev-parse --short HEAD)"

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

# Returns the docker image location (and tag) based on branch info
if [ "$1" == "getDockerImageTag" ] ; then
    if [ "${BRANCH}" == "master" ] ; then
        # development builds
        echo "${DOCKER_REGISTRY}:${VERSION}-${GIT_HASH}"
    elif [ -z "${RELEASE_BRANCH_VERSION}" ] ; then
        # personal branch
        echo "${DOCKER_REGISTRY}:$(echo $BRANCH | tr -cd '[:alnum:]')"
    else
        # release branch
        if dockerImageExists ${DOCKER_REGISTRY}:${VERSION} ; then
            echo "${DOCKER_REGISTRY}:${VERSION}-${GIT_HASH}"
        else
            echo "${DOCKER_REGISTRY}:${VERSION}"
        fi
    fi
    exit 0
fi

# creates helm package
# adjusts helm chart version according to branch info with these rules:
# - sets docker repository tag in values.yaml to the value set in Chart.yaml:appVersion
# - sets helm chart version in Chart.yaml:
#   - if master, use VERSION-HELM_HASH+GIT_HASH
#   - if a rel/* branch:
#     - use VERSION if it doesn't exist yet (first release build)
#     - use VERSION-HELM_HASH+GIT_HASH otherwise
#   - otherwise (all personal branches) don't add to chart
if [ "$1" == "createHelmPackage" ] ; then
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
    elif [ "${BRANCH}" == "master" ] ; then
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

    # Check if chart exists already (ignoring +* git hash)
    mkdir -p charts
    NEW_CHART="$(cd build/charts && ls *.tgz | grep -v -e "-latest" | sed "s/\.tgz$//g" | sed "s/\+.*//g")"
    EXISTING_CHARTS="$(ls *.tgz | grep -v -e "-latest" | sed "s/\.tgz$//g" | sed "s/\+.*//g")"
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
