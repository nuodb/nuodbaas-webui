# (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

PROJECT_DIR := $(shell pwd)
BIN_DIR ?= $(PROJECT_DIR)/bin
export PATH := $(BIN_DIR):$(PATH)

OS := $(shell uname -s | tr '[:upper:]' '[:lower:]')
ARCH := $(shell uname -m | sed "s/x86_64/amd64/g")

KWOKCTL_VERSION ?= 0.5.1
KUBECTL_VERSION ?= 1.28.3
HELM_VERSION ?= 3.16.2
NUODB_CP_VERSION ?= 2.7.0

KWOKCTL := bin/kwokctl
KUBECTL := bin/kubectl
HELM := bin/helm

IMG_REPO := nuodbaas-webui
VERSION := $(shell grep -e "^appVersion:" charts/nuodbaas-webui/Chart.yaml | cut -d \" -f 2 | cut -d - -f 1)
SHA := $(shell git rev-parse --short HEAD)
VERSION_SHA ?= ${VERSION}-${SHA}
UNCOMMITTED := $(shell git status --porcelain)

# The help target prints out all targets with their descriptions organized
# beneath their categories. The categories are represented by '##@' and the
# target descriptions by '##'. The awk commands is responsible for reading the
# entire set of makefiles included in this invocation, looking for lines of the
# file as xyz: ## something, and then pretty-format the target and help. Then,
# if there's a line with ##@ something, that gets pretty-printed as a category.
# More info on the usage of ANSI control characters for terminal formatting:
# https://en.wikipedia.org/wiki/ANSI_escape_code#SGR_parameters
# More info on the awk command:
# http://linuxcommand.org/lc3_adv_awk.php

.PHONY: help
help: ## Display this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)


##@ Production Builds

.PHONY: all
all: run-integration-tests copyright ## build, test + deploy everything

.PHONY: build-image
build-image:  ## build UI and create Docker image
	@docker build -t "${IMG_REPO}:latest" --build-arg "REACT_APP_GIT_SHA=${VERSION_SHA}" -f docker/production/Dockerfile .

.PHONY: copyright
copyright: ### check copyrights
	./copyright.sh

.PHONY: install-crds
install-crds: $(KWOKCTL) $(KUBECTL) $(HELM)
	@$(KWOKCTL) create cluster --wait 120s
	@$(KWOKCTL) get kubeconfig | sed "s/server: https:\/\/127.0.0.1:.[0-9]\+/server: https:\/\/kwok-kwok-kube-apiserver:6443/g" > selenium-tests/files/kubeconfig
	@$(KUBECTL) apply -f selenium-tests/files/nuodb-cp-runtime-config.yaml --context kwok-kwok -n default
	@$(HELM) install -n default nuodb-cp-crd nuodb-cp-crd --repo https://nuodb.github.io/nuodb-cp-releases/charts --version $(NUODB_CP_VERSION)
	@rm -rf nuodb-cp-crd

.PHONY: setup-integration-tests
setup-integration-tests: build-image install-crds ## setup containers before running integration tests
	@if [ "$(NUODB_CP_URL_BASE)" = "" ] ; then \
		cat docker/development/default.conf.template | sed "s#%%%NUODB_CP_URL_BASE%%%#http://localhost:8081#g" > docker/development/default.conf; \
	else \
		cat docker/development/default.conf.template | sed "s#%%%NUODB_CP_URL_BASE%%%#$(NUODB_CP_URL_BASE)#g" > docker/development/default.conf; \
	fi
	@NUODB_CP_VERSION=$(NUODB_CP_VERSION) docker compose -f selenium-tests/compose.yaml up --wait
	@kubectl apply -f docker/development/samples.yaml --context kwok-kwok -n default
	@docker exec selenium-tests-nuodb-cp-1 bash -c "curl \
		http://localhost:8080/users/acme/admin?allowCrossOrganizationAccess=true \
		--data-binary \
            '{\"password\":\"passw0rd\", \"name\":\"admin\", \"organization\": \"acme\", \"accessRule\":{\"allow\": \"all:*\"}}' \
		-X PUT -H \"Content-Type: application/json\" > /dev/null"

.PHONY: teardown-integration-tests
teardown-integration-tests: $(KWOKCTL) ## clean up containers used by integration tests
	@NUODB_CP_VERSION=$(NUODB_CP_VERSION) docker compose -f selenium-tests/compose.yaml down 2> /dev/null
	@$(KWOKCTL) delete cluster 2> /dev/null || true

.PHONY: run-integration-tests-only
run-integration-tests-only: ## integration tests without setup/teardown
	@cd selenium-tests && mvn test && cd ..

.PHONY: run-integration-tests
run-integration-tests: build-image setup-integration-tests ## run integration tests (+setup)
	${MAKE} run-integration-tests-only teardown-integration-tests || (${MAKE} teardown-integration-tests && exit 1)

##@ Development Environment

.PHONY: start-dev
start-dev: setup-integration-tests ## launch WebUI/ControlPlane/Proxy for development environment
	(cd ui && npm install && npm start &)
	docker run --rm -d --name nuodb-webui-dev -v `pwd`/docker/development/default.conf:/etc/nginx/conf.d/default.conf --network=host -it nginx:stable-alpine

.PHONY: stop-dev
stop-dev: teardown-integration-tests ## stop development environment processes (WebUI/ControlPlane/Proxy)
	@PID=$(shell netstat -a -n -p 2> /dev/null | sed -n -E "s/.* 0\.0\.0\.0:3000 .* LISTEN .* ([0-9]+)\/node/\1/p"); \
	if [ "$$PID" != "" ] ; then kill -9 $$PID; fi
	@PID=$(shell docker ps -aq --filter "name=nuodb-webui-dev"); \
	if [ "$$PID" != "" ] ; then docker stop $$PID; fi

$(KWOKCTL): $(KUBECTL)
	mkdir -p bin
	curl -L -s https://github.com/kubernetes-sigs/kwok/releases/download/v$(KWOKCTL_VERSION)/kwokctl-$(OS)-$(ARCH) -o $(KWOKCTL)
	chmod +x $(KWOKCTL)

$(KUBECTL):
	mkdir -p bin
	curl -L -s https://storage.googleapis.com/kubernetes-release/release/v$(KUBECTL_VERSION)/bin/$(OS)/$(ARCH)/kubectl -o $(KUBECTL)
	chmod +x $(KUBECTL)

$(HELM):
	mkdir -p bin
	curl -L -s https://get.helm.sh/helm-v$(HELM_VERSION)-$(OS)-$(ARCH).tar.gz | tar -xzf - -O $(OS)-$(ARCH)/helm > $(HELM)
	chmod +x $(HELM)