help:
	@echo "make all                        - build, test + deploy everything"
	@echo "make build-image                - build UI and create Docker image"
	@echo "make deploy-image               - deploy Docker image to AWS"
	@echo "make run-integration-tests      - run integration tests (+setup)"
	@echo "make setup-integration-tests    - setup containers before running integration tests"
	@echo "make run-integration-tests-only - integration tests without setup/teardown"
	@echo "make teardown-integration-tests - clean up containers used by integration tests"
	@echo "make run-dev                    - launch nginx reverse proxy for development of /ui/ and /nuodb-cp/"

OS := $(shell go env GOOS)
ARCH := $(shell go env GOARCH)

KWOKCTL_VERSION ?= 0.5.1
KWOKCTL := bin/kwokctl
IMG_REPO ?= dbaas-cockpit
IMG_TAG ?= latest

.PHONY: all
all: build-image run-integration-tests deploy-image

.PHONY: build-image
build-image:
	@docker build -t ${IMG_REPO} -f docker/production/Dockerfile .

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
deploy-image: build-image
	@if [ "${PUSH_REPO}" != "" ] ; then \
		docker tag "${IMG_REPO}:${IMG_TAG}" "${PUSH_REPO}:${IMG_TAG}" && \
		docker push "${PUSH_REPO}:${IMG_TAG}"; \
	else \
		echo "PUSH_REPO environment variable must be set" && \
		exit 1; \
	fi

.PHONY: run-dev
run-dev: check-dev-services
	kubectl apply -f docker/development/runtime-config.yaml
	curl http://localhost:8080/users/acme/user1?allowCrossOrganizationAccess=true --data-binary '{"password":"passw0rd", "name":"user1", "organization": "acme", "accessRule":{"allow": "all:*"}}' -X PUT -H "Content-Type: application/json"
	docker run -v `pwd`/docker/development/default.conf:/etc/nginx/conf.d/default.conf --network=host -it nginx:stable-alpine

.PHONY: setup-integration-tests
setup-integration-tests: $(KWOKCTL)
	@$(KWOKCTL) create cluster --wait 60s
	@$(KWOKCTL) get kubeconfig | sed "s/server: https:\/\/127.0.0.1:.[0-9]\+/server: https:\/\/kwok-kwok-kube-apiserver:6443/g" > selenium-tests/files/kubeconfig
	@kubectl apply -f selenium-tests/files/nuodb-cp-runtime-config.yaml --context kwok-kwok -n default
	@curl -L https://github.com/nuodb/nuodb-cp-releases/releases/download/v2.6.0/nuodb-cp-crd-2.6.0.tgz | \
		tar -axzOf - --wildcards nuodb-cp-crd/templates/*.yaml | kubectl apply -f - --context kwok-kwok -n default
	@docker compose -f selenium-tests/compose.yaml up --wait
	@docker exec -it selenium-tests-nuodb-cp-1 bash -c "curl \
		http://localhost:8080/users/acme/user1?allowCrossOrganizationAccess=true \
		--data-binary \
            '{\"password\":\"passw0rd\", \"name\":\"user1\", \"organization\": \"acme\", \"accessRule\":{\"allow\": \"all:*\"}}' \
		-X PUT -H \"Content-Type: application/json\" > /dev/null"

.PHONY: teardown-integration-tests
teardown-integration-tests: $(KWOKCTL)
	@docker compose -f selenium-tests/compose.yaml down
	@$(KWOKCTL) delete cluster

.PHONY: run-integration-tests-only
run-integration-tests-only:
	@cd selenium-tests && mvn test && cd ..

.PHONY: run-integration-tests
run-integration-tests: build-image setup-integration-tests run-integration-tests-only teardown-integration-tests

$(KWOKCTL):
	mkdir -p bin
	curl -L -s https://github.com/kubernetes-sigs/kwok/releases/download/v$(KWOKCTL_VERSION)/kwokctl-$(OS)-$(ARCH) -o $(KWOKCTL)
	chmod +x $(KWOKCTL)
