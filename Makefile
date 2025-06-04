# (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

PROJECT_DIR := $(shell pwd)
BIN_DIR ?= $(PROJECT_DIR)/bin
export PATH := $(BIN_DIR):$(PATH)

OS := $(shell uname -s | tr '[:upper:]' '[:lower:]')
ARCH := $(shell uname -m | sed "s/x86_64/amd64/g")

KIND_VERSION ?= 0.27.0
KUBECTL_VERSION ?= 1.28.3
HELM_VERSION ?= 3.16.2
NUODB_CP_VERSION ?= 2.8.1

NUODB_CP_REPO ?= ../nuodb-control-plane

KIND = $(shell pwd)/bin/kind
KIND_CONTROL_PLANE = kind-kind
KUBECTL := $(shell pwd)/bin/kubectl
HELM := $(shell pwd)/bin/helm
PREVIOUS_CONTEXT := $(shell pwd)/tmp/previous-context

IMG_REPO := nuodbaas-webui
VERSION := $(shell grep -e "^appVersion:" charts/nuodbaas-webui/Chart.yaml | cut -d \" -f 2 | cut -d - -f 1)
SHA := $(shell git rev-parse --short HEAD)
VERSION_SHA ?= ${VERSION}-${SHA}
UNCOMMITTED := $(shell git status --porcelain)

MVN_TEST ?= ResourcesTest

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

.PHONY: create-cluster
create-cluster: $(KIND) $(KUBECTL)
	@if [ "`$(KIND) get clusters`" = "kind" ] ; then \
		echo "Kind cluster exists already"; \
		$(KIND) export kubeconfig; \
		$(KIND) export kubeconfig --kubeconfig selenium-tests/files/kubeconfig; \
	else \
		$(KUBECTL) config current-context 2>/dev/null > $(PREVIOUS_CONTEXT) || true; \
		$(KIND) create cluster --wait 120s --config selenium-tests/kind.yaml; \
		$(KIND) export kubeconfig; \
		$(KIND) export kubeconfig --kubeconfig selenium-tests/files/kubeconfig; \
		$(KUBECTL) apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml; \
		$(KUBECTL) wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=60s; \
	fi
	@sed "s|server: https://127.0.0.1:.[0-9]\+|server: https://kind-control-plane:6443|g" selenium-tests/files/kubeconfig > selenium-tests/files/kubeconfig.tmp && \
		mv selenium-tests/files/kubeconfig.tmp selenium-tests/files/kubeconfig

.PHONY: install-crds
install-crds: create-cluster $(HELM)
	@if [ -d $(NUODB_CP_REPO)/charts/nuodb-cp-crd/templates ] ; then \
		$(HELM) install -n default nuodb-cp-crd $(NUODB_CP_REPO)/charts/nuodb-cp-crd; \
	else \
		$(HELM) install -n default nuodb-cp-crd nuodb-cp-crd --repo https://nuodb.github.io/nuodb-cp-releases/charts --version $(NUODB_CP_VERSION); \
	fi

.PHONY: uninstall-crds
uninstall-crds: $(HELM)
	$(HELM) uninstall --ignore-not-found -n default nuodb-cp-crd

.PHONY: build-cp
build-cp:
	@if [ -f $(NUODB_CP_REPO)/Makefile ] ; then \
		docker images --format={{.Repository}}:{{.Tag}} | grep -q nuodb/nuodb-control-plane:latest || make -C $(NUODB_CP_REPO) docker-build; \
	else \
		docker pull ghcr.io/nuodb/nuodb-cp-images:$(NUODB_CP_VERSION); \
		docker tag ghcr.io/nuodb/nuodb-cp-images:$(NUODB_CP_VERSION) nuodb/nuodb-control-plane; \
	fi

.PHONY: deploy-cp
deploy-cp: build-cp $(HELM) $(KIND)
	@if [ -d $(NUODB_CP_REPO)/charts/nuodb-cp-rest ] ; then \
		$(KIND) load docker-image nuodb/nuodb-control-plane:latest; \
		$(HELM) upgrade --install --wait -n default nuodb-cp $(NUODB_CP_REPO)/charts/nuodb-cp-rest --set image.repository=nuodb/nuodb-control-plane --set image.tag=latest --set cpRest.ingress.enabled=true --set cpRest.ingress.pathPrefix=api; \
	else \
		$(HELM) upgrade --install --wait -n default nuodb-cp nuodb-cp-rest --repo https://nuodb.github.io/nuodb-cp-releases/charts --version $(NUODB_CP_VERSION) --set cpRest.ingress.enabled=true --set cpRest.ingress.pathPrefix=api; \
	fi

.PHONY: undeploy-cp
undeploy-cp: $(HELM)
	@$(HELM) uninstall --ignore-not-found -n default nuodb-cp || true;

.PHONY: deploy-operator
deploy-operator: build-cp $(HELM) $(KIND)
	@if [ -d $(NUODB_CP_REPO)/charts/nuodb-cp-operator ] ; then \
		$(KIND) load docker-image nuodb/nuodb-control-plane:latest; \
		$(HELM) dependency update $(NUODB_CP_REPO)/charts/nuodb-cp-operator; \
		$(HELM) upgrade --install --wait -n default nuodb-operator $(NUODB_CP_REPO)/charts/nuodb-cp-operator --set image.repository=nuodb/nuodb-control-plane --set image.tag=latest; \
	else \
		$(HELM) upgrade --install --wait -n default nuodb-operator nuodb-cp-operator --repo https://nuodb.github.io/nuodb-cp-releases/charts --version $(NUODB_CP_VERSION); \
	fi

.PHONY: undeploy-operator
undeploy-operator: $(HELM)
	@$(HELM) uninstall --ignore-not-found -n default nuodb-operator || true;

.PHONY: build-sql
build-sql:
	@if [ -f ../nuodbaas-sql/Makefile ] ; then \
		cd ../nuodbaas-sql; make build-image; \
	fi

.PHONY: deploy-sql
deploy-sql: build-sql $(HELM) $(KIND)
	@if [ -d ../nuodbaas-sql/charts/nuodbaas-sql ] ; then \
		$(KIND) load docker-image nuodbaas-sql:latest; \
		$(HELM) upgrade --install --wait -n default nuodbaas-sql ../nuodbaas-sql/charts/nuodbaas-sql --set image.repository=nuodbaas-sql --set image.tag=latest --set nuodbaasSql.ingress.enabled=true; \
	fi

.PHONY: undeploy-sql
undeploy-sql: build-sql $(HELM)
	@$(HELM) uninstall --ignore-not-found -n default nuodbaas-sql; \

.PHONY: build-webui
build-webui:
	@if [ -f Makefile ] ; then \
		make build-image; \
	else \
		docker pull ghcr.io/nuodb/nuodbaas-webui; \
		docker tag ghcr.io/nuodb/nuodbaas-webui nuodbaas-webui; \
	fi

.PHONY: deploy-webui
deploy-webui: build-webui $(HELM) $(KIND)
	@if [ -d charts/nuodbaas-webui ] ; then \
		$(KIND) load docker-image nuodbaas-webui:latest; \
		$(HELM) upgrade --install --wait -n default nuodbaas-webui charts/nuodbaas-webui --set image.repository=nuodbaas-webui --set image.tag=latest --set nuodbaasWebui.ingress.enabled=true --set nuodbaasWebui.cpUrl=/api; \
	fi

.PHONY: undeploy-webui
undeploy-webui: $(HELM)
	@$(HELM) uninstall --ignore-not-found -n default nuodbaas-webui; \

.PHONY: setup-integration-tests
setup-integration-tests: $(KUBECTL) build-image install-crds deploy-cp deploy-operator deploy-sql deploy-webui ## setup containers before running integration tests
	@if [ "$(NUODB_CP_URL_BASE)" = "" ] ; then \
		cat docker/development/default.conf.template | sed "s#%%%NUODB_CP_URL_BASE%%%#http://localhost:8081#g" > docker/development/default.conf; \
	else \
		cat docker/development/default.conf.template | sed "s#%%%NUODB_CP_URL_BASE%%%#$(NUODB_CP_URL_BASE)#g" > docker/development/default.conf; \
	fi
	@if [ "$(NUODB_SQL_URL_BASE)" = "" ] ; then \
		cat docker/development/default.conf.template | sed "s#%%%NUODB_SQL_URL_BASE%%%#http://localhost#g" > docker/development/default.conf; \
	else \
		cat docker/development/default.conf.template | sed "s#%%%NUODB_SQL_URL_BASE%%%#$(NUODB_SQL_URL_BASE)#g" > docker/development/default.conf; \
	fi
	@docker compose -f selenium-tests/compose.yaml up --wait
	@$(KUBECTL) exec -n default -it $(shell ${KUBECTL} get pod -n default -l "app=nuodb-cp-nuodb-cp-rest" -o name) -- bash -c "curl \
		http://localhost:8080/users/acme/admin?allowCrossOrganizationAccess=true \
		--data-binary \
            '{\"password\":\"passw0rd\", \"name\":\"admin\", \"organization\": \"acme\", \"accessRule\":{\"allow\": \"all:*\"}}' \
		-X PUT -H \"Content-Type: application/json\" > /dev/null"
	@$(KUBECTL) exec -n default -it $(shell ${KUBECTL} get pod -n default -l "app=nuodb-cp-nuodb-cp-rest" -o name) -- bash -c "curl \
		http://localhost:8080/users/integrationtest/admin \
		--data-binary \
            '{\"password\":\"passw0rd\", \"name\":\"admin\", \"organization\": \"integrationtest\", \"accessRule\":{\"allow\": \"all:integrationtest\"}}' \
		-X PUT -H \"Content-Type: application/json\" > /dev/null"
	$(KUBECTL) apply -n default -f selenium-tests/files/cas-idp.yaml
	@docker ps
	@$(KUBECTL) describe ingress -A
	@$(KUBECTL) describe pods -A
	@$(KUBECTL) get pods -A

.PHONY: teardown-integration-tests
teardown-integration-tests: $(KIND) undeploy-sql undeploy-webui undeploy-operator undeploy-cp uninstall-crds ## clean up containers used by integration tests
	@docker compose -f selenium-tests/compose.yaml down
	@if [ -f $(PREVIOUS_CONTEXT) ] ; then \
		cat $(PREVIOUS_CONTEXT) | xargs -r $(KUBECTL) config use-context; \
		rm $(PREVIOUS_CONTEXT) ; \
		$(KIND) delete cluster 2> /dev/null || true ; \
	fi

.PHONY: run-integration-tests-only
run-integration-tests-only: ## integration tests without setup/teardown
	@cd selenium-tests && mvn test && cd ..

.PHONY: build-integration-tests-docker
build-integration-tests-docker:
	@cd selenium-tests && docker build -t "${IMG_REPO}:test" . && cd ..

.PHONY: run-smoke-tests-docker-only
run-smoke-tests-docker-only: build-integration-tests-docker
	@cd selenium-tests && docker run -e URL_BASE=http://selenium-tests-nginx-1 -e CP_URL="http://selenium-tests-nuodb-cp-1:8080" -e MVN_TEST=${MVN_TEST} --net kind -it "${IMG_REPO}:test" && cd ..

.PHONY: run-smoke-tests-docker
run-smoke-tests-docker: setup-integration-tests ## integration tests without setup/teardown (docker version)
	@${MAKE} run-smoke-tests-docker-only teardown-integration-tests || (${MAKE} teardown-integration-tests && exit 1)

.PHONY: run-integration-tests
run-integration-tests: build-image setup-integration-tests ## run integration tests (+setup)
	${MAKE} run-integration-tests-only teardown-integration-tests || (${MAKE} teardown-integration-tests && exit 1)


##@ Development Environment

.PHONY: start-dev
start-dev: stop-dev setup-integration-tests ## launch WebUI/ControlPlane/Proxy for development environment
	(cd ui && npm install && npm start &)
	docker run --rm -d --name nuodb-webui-dev -v `pwd`/docker/development/default.conf:/etc/nginx/conf.d/default.conf --network=host -it nginx:stable-alpine

.PHONY: stop-dev
stop-dev: teardown-integration-tests ## stop development environment processes (WebUI/ControlPlane/Proxy)
	@PID=$(shell netstat -a -n -p 2> /dev/null | sed -n -E "s/.* 0\.0\.0\.0:3000 .* LISTEN .* ([0-9]+)\/node/\1/p"); \
	if [ "$$PID" != "" ] ; then kill -9 $$PID; fi
	@PID=$(shell docker ps -aq --filter "name=nuodb-webui-dev"); \
	if [ "$$PID" != "" ] ; then docker stop $$PID; fi
	@DOT_KIND_OWNER=$(shell stat -c '%U' ~/.kind 2>/dev/null); \
	if [ "$$DOT_KIND_OWNER" = "root" ] ; then sudo rm -r ~/.kind; fi
	@rm -rf ~/.kind


$(KIND):
	mkdir -p $(shell dirname ${KIND})
	curl -f -Lo ${KIND} https://kind.sigs.k8s.io/dl/v${KIND_VERSION}/kind-${OS}-${ARCH}
	chmod +x ${KIND}

$(KUBECTL):
	mkdir -p $(shell dirname ${KUBECTL})
	curl -L -s https://storage.googleapis.com/kubernetes-release/release/v$(KUBECTL_VERSION)/bin/$(OS)/$(ARCH)/kubectl -o $(KUBECTL)
	chmod +x $(KUBECTL)

$(HELM):
	mkdir -p $(shell dirname ${HELM})
	curl -L -s https://get.helm.sh/helm-v$(HELM_VERSION)-$(OS)-$(ARCH).tar.gz | tar -xzf - -O $(OS)-$(ARCH)/helm > $(HELM)
	chmod +x $(HELM)
