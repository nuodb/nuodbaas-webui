all:
	@echo "make run-dev"
	@echo "make build-image"
	@echo "make deploy-image"
	@echo "make build-ui"

IMG_REPO ?= nuodb/dbaas-cockpit
IMG_TAG ?= latest

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

.PHONY: build-ui
build-ui:
	@cd ui && npm run build && cd ..

.PHONY: build-image
build-image:
	@docker build -t ${IMG_REPO} -f docker/production/Dockerfile .

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
