# (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

.PHONY: help
help: ## Display this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

PROJECT_DIR := $(shell pwd)
BIN_DIR ?= $(PROJECT_DIR)/bin
export PATH := $(BIN_DIR):$(PATH)

OS := $(shell uname -s | tr '[:upper:]' '[:lower:]')
ARCH := $(shell uname -m | sed "s/x86_64/amd64/g")

KWOKCTL_VERSION ?= 0.5.1
KUBECTL_VERSION ?= 1.28.3
NUODB_CP_VERSION ?= 2.6.0

KWOKCTL := bin/kwokctl
KUBECTL := bin/kubectl

IMG_REPO := dbaas-cockpit
VERSION := $(shell grep -e "^appVersion:" charts/dbaas-cockpit/Chart.yaml | cut -d \" -f 2 | cut -d - -f 1)
SHA := $(shell git rev-parse --short HEAD)
VERSION_SHA ?= ${VERSION}-dev.sha-${SHA}
UNCOMMITTED := $(shell rm -f get_helm.sh && git status --porcelain)

##@ Production Builds

.PHONY: all
all: run-integration-tests deploy-image ## build, test + deploy everything

.PHONY: build-image
build-image:  ## build UI and create Docker image
	@docker build -t "${IMG_REPO}:latest" -f docker/production/Dockerfile .

.PHONY: check-dev-services
check-dev-services:
	@if [ "`netstat -a -n | grep ":3000 "`" = "" ] ; then \
		echo "React UI service is not listening on port 3000. Run it with \"npm start\""; \
		exit 1; \
	fi
	@if [ "`netstat -a -n | grep ":8080 "`" = "" ] ; then \
		echo "NuoDB control plane is not running on port 8080"; \
		exit 1; \
	fi

.PHONY: deploy-image
deploy-image: build-image ## deploy Docker image to AWS
	@if [ "${ECR_ACCOUNT_URL}" = "" ] ; then \
		echo "ECR_ACCOUNT_URL environment variable must be set"; \
	elif [ "${UNCOMMITTED}" != "" ] ; then \
		echo "Uncommitted changes in GIT. Will not push to ECR." && \
		echo "${UNCOMMITTED}" && \
		exit 1; \
	else \
		sed -i "s/^version: \".*\"/version: \"${VERSION_SHA}\"/g" charts/dbaas-cockpit/Chart.yaml && \
		sed -i "s/^appVersion: \".*\"/appVersion: \"${VERSION_SHA}\"/g" charts/dbaas-cockpit/Chart.yaml && \
		docker tag "${IMG_REPO}:latest" "${ECR_ACCOUNT_URL}/${IMG_REPO}-docker:${VERSION_SHA}" && \
		helm package charts/dbaas-cockpit && \
		git checkout HEAD -- charts/dbaas-cockpit/Chart.yaml && \
		docker push "${ECR_ACCOUNT_URL}/${IMG_REPO}-docker:${VERSION_SHA}" && \
		helm push dbaas-cockpit-*.tgz "oci://${ECR_ACCOUNT_URL}/"; \
	fi

.PHONY: install-crds
install-crds: $(KWOKCTL) $(KUBECTL)
	@$(KWOKCTL) create cluster --wait 120s
	@$(KWOKCTL) get kubeconfig | sed "s/server: https:\/\/127.0.0.1:.[0-9]\+/server: https:\/\/kwok-kwok-kube-apiserver:6443/g" > selenium-tests/files/kubeconfig
	@$(KUBECTL) apply -f selenium-tests/files/nuodb-cp-runtime-config.yaml --context kwok-kwok -n default
	@curl -L https://github.com/nuodb/nuodb-cp-releases/releases/download/v$(NUODB_CP_VERSION)/nuodb-cp-crd-$(NUODB_CP_VERSION).tgz | \
		tar -axzOf - --wildcards nuodb-cp-crd/templates/*.yaml | $(KUBECTL) apply -f - --context kwok-kwok -n default

.PHONY: setup-integration-tests
setup-integration-tests: build-image install-crds ## setup containers before running integration tests
	@docker compose -f selenium-tests/compose.yaml up --wait
	@docker exec -it selenium-tests-nuodb-cp-1 bash -c "curl \
		http://localhost:8080/users/acme/admin?allowCrossOrganizationAccess=true \
		--data-binary \
            '{\"password\":\"passw0rd\", \"name\":\"admin\", \"organization\": \"acme\", \"accessRule\":{\"allow\": \"all:*\"}}' \
		-X PUT -H \"Content-Type: application/json\" > /dev/null"

.PHONY: teardown-integration-tests
teardown-integration-tests: $(KWOKCTL) ## clean up containers used by integration tests
	@docker compose -f selenium-tests/compose.yaml down
	@$(KWOKCTL) delete cluster

.PHONY: run-integration-tests-only
run-integration-tests-only: ## integration tests without setup/teardown
	@cd selenium-tests && mvn test && cd ..

.PHONY: run-integration-tests
run-integration-tests: build-image setup-integration-tests ## run integration tests (+setup)
	${MAKE} run-integration-tests-only teardown-integration-tests || (${MAKE} teardown-integration-tests && exit 1)

##@ Development Environment

.PHONY: run-dev
run-dev: check-dev-services install-crds ## launch nginx reverse proxy for development of /ui/ and /nuodb-cp/
	$(KUBECTL) apply -f docker/development/runtime-config.yaml
	curl http://localhost:8080/users/acme/admin?allowCrossOrganizationAccess=true --data-binary '{"password":"passw0rd", "name":"admin", "organization": "acme", "accessRule":{"allow": "all:*"}}' -X PUT -H "Content-Type: application/json"
	docker run -v `pwd`/docker/development/default.conf:/etc/nginx/conf.d/default.conf --network=host -it nginx:stable-alpine

.PHONY: deploy-nuodb-control-plane
deploy-nuodb-control-plane: ## install NuoDB Control Plane Helm Charts
	@./nuodb-cp.sh install

.PHONY: undeploy-nuodb-control-plane
undeploy-nuodb-control-plane: ## uninstall NuoDB Control Plane Helm Charts
	@./nuodb-cp.sh uninstall

$(KWOKCTL): $(KUBECTL)
	mkdir -p bin
	curl -L -s https://github.com/kubernetes-sigs/kwok/releases/download/v$(KWOKCTL_VERSION)/kwokctl-$(OS)-$(ARCH) -o $(KWOKCTL)
	chmod +x $(KWOKCTL)

$(KUBECTL):
	mkdir -p bin
	curl -L -s https://storage.googleapis.com/kubernetes-release/release/v$(KUBECTL_VERSION)/bin/$(OS)/$(ARCH)/kubectl -o $(KUBECTL)
	chmod +x $(KUBECTL)
