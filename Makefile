all:
	@echo "make build-production"
	@echo "make run-dev"

build-production:
	docker build -t dbaas-cockpit -f docker/production/Dockerfile .

check-dev-services:
	@if [ "`netstat -a -n | grep ":3000 "`" = "" ] ; then \
		echo "React UI service is not listening on port 3000. Run it with \"npm start\""; \
		exit 1; \
	fi
	@if [ "`netstat -a -n | grep ":8080 "`" = "" ] ; then \
		echo "NuoDB control plane is not running on port 8080"; \
		exit 1; \
	fi

run-dev: check-dev-services
	kubectl apply -f docker/development/runtime-config.yaml
	curl http://localhost:8080/users/acme/user1?allowCrossOrganizationAccess=true --data-binary '{"password":"passw0rd", "name":"user1", "organization": "acme", "accessRule":{"allow": "all:*"}}' -X PUT -H "Content-Type: application/json"
	docker run -v `pwd`/docker/development/default.conf:/etc/nginx/conf.d/default.conf --network=host -it nginx:stable-alpine
