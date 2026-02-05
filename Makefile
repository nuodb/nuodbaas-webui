# (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved.

PROJECT_DIR := $(shell pwd)
BIN_DIR ?= $(PROJECT_DIR)/bin
export PATH := $(BIN_DIR):$(PATH)
COVERAGE ?= "false"

OS := $(shell uname -s | tr '[:upper:]' '[:lower:]')
ARCH := $(shell uname -m | sed "s/x86_64/amd64/g" | sed "s/aarch64/arm64/g")

KIND_VERSION ?= 0.27.0
KUBECTL_VERSION ?= 1.28.3
HELM_VERSION ?= 3.16.2
NUODB_CP_VERSION ?= 2.10.0
PROMETHEUS_VERSION ?= 79.6.1

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

HELM_CP_SETTINGS := --set cpRest.fullnameOverride=nuodb-cp-rest --set cpRest.ingress.enabled=true --set cpRest.ingress.pathPrefix=api --set cpRest.extraArgs[0]=-p --set cpRest.extraArgs[1]='com.nuodb.controlplane.server.passthroughLabelKeyPrefixes=ds.com/\,*.ds.com/'
HELM_OPERATOR_SETTINGS := --set nuodb-cp-config.nuodb.license.enabled=true --set nuodb-cp-config.nuodb.license.secret.create=true --set nuodb-cp-config.nuodb.license.secret.name=nuodb-license --set nuodb-cp-config.nuodb.license.content="$(shell cat nuodb.lic)"

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

.PHONY: build-coverage
build-coverage:  ## build code coverage UI and create Docker image
	@docker build -t "${IMG_REPO}:coverage" --build-arg "REACT_APP_GIT_SHA=${VERSION_SHA}" -f docker/production/Dockerfile-coverage .

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

.PHONY: install-crds-from-aws
install-crds-from-aws: create-cluster $(HELM) aws-login
		$(HELM) upgrade --install -n default nuodb-cp-crd oci://${ECR_ACCOUNT_URL}/nuodb-cp-crd --version $(NUODB_CP_VERSION)-main-latest

.PHONY: install-crds
install-crds: create-cluster $(HELM)
	@if [ -d $(NUODB_CP_REPO)/charts/nuodb-cp-crd/templates ] ; then \
		$(HELM) upgrade --install -n default nuodb-cp-crd $(NUODB_CP_REPO)/charts/nuodb-cp-crd; \
	else \
		$(HELM) upgrade --install -n default nuodb-cp-crd nuodb-cp-crd --repo https://nuodb.github.io/nuodb-cp-releases/charts --version $(NUODB_CP_VERSION) \
		|| ${MAKE} install-crds-from-aws; \
	fi

.PHONY: uninstall-crds
uninstall-crds: $(KIND) $(HELM)
	@if [ "`$(KIND) get clusters`" = "kind" ] ; then \
		$(HELM) uninstall --ignore-not-found -n default nuodb-cp-crd; \
	fi

.PHONY: aws-login
aws-login:
	@if [ "${AWS_REGION}" = "" ] || [ "${AWS_ACCESS_KEY_ID}" = "" ] || [ "${AWS_SECRET_ACCESS_KEY}" = "" ] ; then \
		echo "Must specify AWS_REGION, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables"; \
		exit 1; \
	fi
	@AWS_ACCOUNT_ID="$(shell aws sts get-caller-identity --query Account | sed 's/^"\(.*\)"$$/\1/g')" \
	ECR_ACCOUNT_URL="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com" \
	aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ECR_ACCOUNT_URL}"

.PHONY: pull-cp-from-ecr
pull-cp-from-ecr: aws-login
	docker pull ${ECR_ACCOUNT_URL}/nuodb/nuodb-control-plane:$(NUODB_CP_VERSION)-main-latest \
	&& docker tag ${ECR_ACCOUNT_URL}/nuodb/nuodb-control-plane:$(NUODB_CP_VERSION)-main-latest nuodb/nuodb-control-plane

.PHONY: build-cp
build-cp:
	# Build / Pull nuodb-control-plane image
	# 1. Attempt to build from adjacent directory (i.e. in the development environment)
	# 2. If (1) fails, attempt to pull a release image from github (typically for patch builds)
	# 3. If (2) fails, pull image from AWS (for the latest build in the "main" branch)
	@if [ -f $(NUODB_CP_REPO)/Makefile ] ; then \
		${MAKE} -C $(NUODB_CP_REPO) docker-build; \
	else \
		docker pull ghcr.io/nuodb/nuodb-cp-images:$(NUODB_CP_VERSION) 2> /dev/null \
		&& docker tag ghcr.io/nuodb/nuodb-cp-images:$(NUODB_CP_VERSION) nuodb/nuodb-control-plane \
		|| ${MAKE} pull-cp-from-ecr; \
	fi

.PHONY: deploy-rest-from-aws
deploy-rest-from-aws: aws-login $(HELM) $(KIND)
	@docker pull ${ECR_ACCOUNT_URL}/nuodb/nuodb-control-plane:$(NUODB_CP_VERSION)-main-latest \
	&& $(KIND) load docker-image ${ECR_ACCOUNT_URL}/nuodb/nuodb-control-plane:$(NUODB_CP_VERSION)-main-latest \
	&& $(HELM) upgrade --install --wait -n default nuodb-cp \
		oci://${ECR_ACCOUNT_URL}/nuodb-cp-rest \
		--version $(NUODB_CP_VERSION)-main-latest \
		--set image.repository=${ECR_ACCOUNT_URL}/nuodb/nuodb-control-plane \
		--set image.tag=$(NUODB_CP_VERSION)-main-latest \
		$(HELM_CP_SETTINGS)

.PHONY: deploy-cp
deploy-cp: build-cp $(HELM) $(KIND)
	@if [ -d $(NUODB_CP_REPO)/charts/nuodb-cp-rest ] ; then \
		$(KIND) load docker-image nuodb/nuodb-control-plane:latest; \
		$(HELM) upgrade --install --wait -n default nuodb-cp $(NUODB_CP_REPO)/charts/nuodb-cp-rest \
			--set image.repository=nuodb/nuodb-control-plane \
			--set image.tag=latest \
			$(HELM_CP_SETTINGS) \
			; \
	else \
		$(HELM) upgrade --install --wait -n default nuodb-cp nuodb-cp-rest \
			--repo https://nuodb.github.io/nuodb-cp-releases/charts \
			--version $(NUODB_CP_VERSION) \
			$(HELM_CP_SETTINGS) \
		|| ${MAKE} deploy-rest-from-aws; \
	fi

.PHONY: undeploy-cp
undeploy-cp: $(KIND) $(HELM)
	@if [ "`$(KIND) get clusters`" = "kind" ] ; then \
		$(HELM) uninstall --ignore-not-found -n default nuodb-cp || true; \
	fi

.PHONY: deploy-operator-from-aws
deploy-operator-from-aws: aws-login $(KIND) $(HELM)
	@docker pull ${ECR_ACCOUNT_URL}/nuodb/nuodb-control-plane:$(NUODB_CP_VERSION)-main-latest \
	&& $(KIND) load docker-image ${ECR_ACCOUNT_URL}/nuodb/nuodb-control-plane:$(NUODB_CP_VERSION)-main-latest \
	&& $(HELM) upgrade --install --wait -n default nuodb-operator \
	oci://${ECR_ACCOUNT_URL}/nuodb-cp-operator --version $(NUODB_CP_VERSION)-main-latest \
	--set image.repository=${ECR_ACCOUNT_URL}/nuodb/nuodb-control-plane \
	--set image.tag=$(NUODB_CP_VERSION)-main-latest \
	$(HELM_OPERATOR_SETTINGS)

.PHONY: deploy-operator
deploy-operator: build-cp nuodb.lic $(HELM) $(KIND)
	@if [ -d $(NUODB_CP_REPO)/charts/nuodb-cp-operator ] ; then \
		$(KIND) load docker-image nuodb/nuodb-control-plane:latest; \
		$(HELM) dependency update $(NUODB_CP_REPO)/charts/nuodb-cp-operator; \
		$(HELM) upgrade --install --wait -n default nuodb-operator $(NUODB_CP_REPO)/charts/nuodb-cp-operator \
		--set image.repository=nuodb/nuodb-control-plane \
		--set image.tag=latest \
        $(HELM_OPERATOR_SETTINGS); \
	elif [ "`curl "https://nuodb.github.io/nuodb-cp-releases/charts/index.yaml" | grep -e "appVersion: $(NUODB_CP_VERSION)$$"`" = "" ] ; then \
		${MAKE} deploy-operator-from-aws; \
	else \
		$(HELM) upgrade --install --wait -n default nuodb-operator nuodb-cp-operator --repo https://nuodb.github.io/nuodb-cp-releases/charts --version $(NUODB_CP_VERSION) \
        $(HELM_OPERATOR_SETTINGS); \
	fi

.PHONY: undeploy-operator
undeploy-operator: $(KIND) $(HELM)
	@if [ "`$(KIND) get clusters`" = "kind" ] ; then \
		$(HELM) uninstall --no-hooks --ignore-not-found -n default nuodb-operator || true; \
	fi

.PHONY: deploy-monitoring
deploy-monitoring:
	helm repo add prometheus-community "https://prometheus-community.github.io/helm-charts"
	helm upgrade --install -n default kube-prometheus-stack prometheus-community/kube-prometheus-stack --wait

.PHONY: undeploy-monitoring
undeploy-monitoring:
	@if [ "`$(KIND) get clusters`" = "kind" ] ; then \
		$(HELM) uninstall -n default kube-prometheus-stack; \
	fi

.PHONY: build-sql
build-sql:
	@if [ -f ../nuodbaas-sql/Makefile ] ; then \
		cd ../nuodbaas-sql; ${MAKE} build-image; \
	fi

.PHONY: deploy-sql
deploy-sql: build-sql $(HELM) $(KIND)
	@if [ -d ../nuodbaas-sql/charts/nuodbaas-sql ] ; then \
		$(KIND) load docker-image nuodbaas-sql:latest; \
		$(HELM) upgrade --install --wait -n default nuodbaas-sql ../nuodbaas-sql/charts/nuodbaas-sql --set image.repository=nuodbaas-sql --set image.tag=latest --set nuodbaasSql.ingress.enabled=true --set nuodbaasSql.cpUrl=http://nuodb-cp-rest:8080; \
	fi

.PHONY: undeploy-sql
undeploy-sql: $(KIND) $(HELM) build-sql
	@if [ "`$(KIND) get clusters`" = "kind" ] ; then \
		$(HELM) uninstall --ignore-not-found -n default nuodbaas-sql; \
	fi

.PHONY: deploy-webui
deploy-webui: $(HELM) $(KIND)  ## deploy WebUI
	@if [ -d charts/nuodbaas-webui ] ; then \
		if [ "${COVERAGE}" = "true" ] ; then \
			${MAKE} build-coverage && \
			$(KIND) load docker-image nuodbaas-webui:coverage && \
			$(HELM) upgrade --install --wait -n default nuodbaas-webui charts/nuodbaas-webui --set image.repository=nuodbaas-webui --set image.tag=coverage --set nuodbaasWebui.ingress.enabled=true --set nuodbaasWebui.cpUrl=/api && \
			mkdir -p selenium-tests/target && \
			for i in `seq 1 10`; do if [ ! -d selenium-tests/target/build_js ] ; then \
				curl http://localhost/ui/build_js.tgz | tar -C selenium-tests/target -xzf -; \
				if [ ! -d selenium-tests/target/build_js ] ; then \
					sleep 10; \
				fi; \
			fi; done; \
			if [ ! -d selenium-tests/target/build_js ] ; then \
				echo "Unable to download Javascript sources"; \
				exit 1; \
			fi; \
		else \
			${MAKE} build-image && \
			$(KIND) load docker-image nuodbaas-webui:latest && \
			$(HELM) upgrade --install --wait -n default nuodbaas-webui charts/nuodbaas-webui --set image.repository=nuodbaas-webui --set image.tag=latest --set nuodbaasWebui.ingress.enabled=true --set nuodbaasWebui.cpUrl=/api; \
		fi \
	fi

.PHONY: undeploy-webui
undeploy-webui: $(KIND) $(HELM)
	@if [ "`$(KIND) get clusters`" = "kind" ] ; then \
		$(HELM) uninstall --ignore-not-found -n default nuodbaas-webui; \
	fi

.PHONY: setup-nginx-default-conf
setup-nginx-default-conf:
	@if [ "$(NUODB_CP_URL_BASE)" = "" ] ; then \
		cat docker/development/default.conf.template | sed "s#%%%NUODB_CP_URL_BASE%%%#http://localhost:8081#g" > docker/development/default.conf; \
	else \
		cat docker/development/default.conf.template | sed "s#%%%NUODB_CP_URL_BASE%%%#$(NUODB_CP_URL_BASE)#g" > docker/development/default.conf; \
	fi
	@if [ "$(NUODB_SQL_URL_BASE)" = "" ] ; then \
		sed -i "s#%%%NUODB_SQL_URL_BASE%%%#http://localhost#g" docker/development/default.conf; \
	else \
		sed -i "s#%%%NUODB_SQL_URL_BASE%%%#$(NUODB_SQL_URL_BASE)#g" docker/development/default.conf; \
	fi

.PHONY: setup-integration-tests
setup-integration-tests: $(KUBECTL) setup-nginx-default-conf install-crds deploy-monitoring deploy-cp deploy-operator deploy-sql deploy-webui ## setup containers before running integration tests
	@if [ "$(ARCH)" = "arm64" ] ; then \
		docker pull seleniarm/standalone-chromium && \
		docker tag seleniarm/standalone-chromium selenium-standalone; \
	else \
		docker pull selenium/standalone-chrome:131.0 && \
		docker tag selenium/standalone-chrome:131.0 selenium-standalone; \
	fi

	@docker compose -f selenium-tests/compose.yaml up --wait
	@$(KUBECTL) exec -n default -it $(shell ${KUBECTL} get pod -n default -l "app=nuodb-cp-rest" -o name) -- bash -c "curl \
		http://localhost:8080/users/acme/admin?allowCrossOrganizationAccess=true \
		--data-binary \
            '{\"password\":\"passw0rd\", \"name\":\"admin\", \"organization\": \"acme\", \"accessRule\":{\"allow\": [\"all:*\",\"all:/cluster/*\"]}}' \
		-X PUT -H \"Content-Type: application/json\" > /dev/null"
	@$(KUBECTL) exec -n default -it $(shell ${KUBECTL} get pod -n default -l "app=nuodb-cp-rest" -o name) -- bash -c "curl \
		http://localhost:8080/users/integrationtest/admin?allowCrossOrganizationAccess=true \
		--data-binary \
            '{\"password\":\"passw0rd\", \"name\":\"admin\", \"organization\": \"integrationtest\", \"accessRule\":{\"allow\": [\"all:integrationtest\",\"all:integrationtest2\",\"all:/cluster/*\"]}}' \
		-X PUT -H \"Content-Type: application/json\" > /dev/null"
	$(KUBECTL) apply -n default -f selenium-tests/files/cas-idp.yaml
	$(KUBECTL) apply -n default -f selenium-tests/files/nuodb-cp-image-versions.yaml
	@docker ps
	@$(KUBECTL) describe ingress -A
	@$(KUBECTL) describe pods -A
	@$(KUBECTL) get pods -A

.PHONY: teardown-integration-tests
teardown-integration-tests: $(KIND) undeploy-sql undeploy-webui undeploy-operator undeploy-cp undeploy-monitoring uninstall-crds ## clean up containers used by integration tests
	@docker compose -f selenium-tests/compose.yaml down
	@if [ -f $(PREVIOUS_CONTEXT) ] ; then \
		cat $(PREVIOUS_CONTEXT) | xargs -r $(KUBECTL) config use-context; \
		rm $(PREVIOUS_CONTEXT) ; \
		$(KIND) delete cluster 2> /dev/null || true ; \
	fi

.PHONY: run-integration-tests-only
run-integration-tests-only: ## integration tests without setup/teardown
	@rm -rf selenium-tests/target/.nyc_output
	@cd selenium-tests && mvn test && cd ..
	@if [ "${COVERAGE}" = "true" ] ; then \
		cd selenium-tests && \
		npx nyc report -r text --cwd target && \
		npx nyc report -r html --cwd target --report-dir coverage && \
		cd .. ; \
	fi

.PHONY: run-unit-tests
run-unit-tests: ## run unit tests
	@cd ui && npm install && npm run coverage && cd ..

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

.PHONY: start-dev-remote
start-dev-remote: setup-nginx-default-conf ## launch WebUI to remote Control Plane. Set environment variables NUODB_CP_URL_BASE and NUODB_SQL_URL_BASE
	@if [ "$(NUODB_CP_URL_BASE)" = "" ] || [ "$(NUODB_SQL_URL_BASE)" = "" ]; then \
		echo "ERROR: Environment variables NUODB_CP_URL_BASE and NUODB_SQL_URL_BASE need to be set."; \
		exit 1 \
		; \
	fi
	(cd ui && npm install && npm start &)
	docker run --rm -d --name nuodb-webui-dev -v `pwd`/docker/development/default.conf:/etc/nginx/conf.d/default.conf --network=host -it nginx:stable-alpine

.PHONY: stop-dev-remote ## stop WebUI to remote Controll Plane
stop-dev-remote:
	@PID=$(shell netstat -a -n -p 2> /dev/null | sed -n -E "s/.* 0\.0\.0\.0:3000 .* LISTEN .* ([0-9]+)\/node/\1/p"); \
	if [ "$$PID" != "" ] ; then kill -9 $$PID; fi
	@PID=$(shell docker ps -aq --filter "name=nuodb-webui-dev"); \
	if [ "$$PID" != "" ] ; then docker stop $$PID; fi

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

nuodb.lic:
	@if [ "$(NUODB_LICENSE_CONTENT)" != "" ]; then \
		echo "$(NUODB_LICENSE_CONTENT)" | base64 -d > nuodb.lic; \
		echo "Found nuodb.lic in NUODB_LICENSE_CONTENT environment variable"; \
	elif [ -f ../nuodb/build/test/admin2/enterprise.lic ]; then \
		cp ../nuodb/build/test/admin2/enterprise.lic ./nuodb.lic; \
		echo "Copied enterprise.lic from nuodb repo"; \
	else \
		echo "Either copy an \"nuodb.lic\" to the project directory or set a base64 encoded NUODB_LICENSE_CONTENT environment variable"; \
		exit 1; \
	fi
