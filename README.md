# NuoDBaaS WebUI

User Interface to the NuoDB DBaaS Rest service (nuodb-control-plane)

## Setup the development environment

The development environment consists of the `nuodb-control-plane` REST server, the `nuodbaas-webui` as a React application and an `nginx` reverse proxy to work around CORS issues connecting the UI to the REST service.

Start the development environment with

```
make start-dev
```

To stop the development environment with

```
make stop-dev
```

### Access the UI

```
Open in the browser at http://localhost:81/
Organization: acme
Username: admin
Password: passw0rd
```

## Run Integration Tests via Selenium

To run the integration tests from the command line, run

```
make run-integration-tests
```

or bring up the environment, run the tests and bring down the Selenium environment with:

```
make setup-integration-tests
make run-integration-tests-only
make teardown-integration-tests
```

The Integration tests are regular JUnit tests going against the Selenium container, which can be run in debug mode in your IDE as well. Location: `selenium-tests/src/test/java/com/nuodb/selenium`. Make sure you run `make setup-integration-tests` beforehand.

To monitor the UI while the tests are running, go to this URL: `http://localhost:7900/?autoconnect=1&resize=scale&password=secret⁠`

## Add Open Telemetry to the Control Plane
To add Open Telementry to the control plane, insert following lines before the "USER" line in `nuodb-control-plane/docker/Dockerfile`:

```
RUN curl -L -O https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar -o /opentelemetry-javaagent.jar
ENV JAVA_TOOL_OPTIONS="-Dotel.instrumentation.external.annotations.include=com.nuodb.controlplane.util.OtelTrace -javaagent:/opentelemetry-javaagent.jar"
ENV OTEL_TRACES_EXPORTER=otlp
ENV OTEL_METRICS_EXPORTER=otlp
ENV OTEL_LOGS_EXPORTER=otlp
ENV OTEL_METRIC_EXPORT_INTERVAL=15000
ENV OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger.default.svc.cluster.local:4318
ENV OTEL_SERVICE_NAME=nuodb-cp
```

Create file `nuodb-control-plane/rest-service/src/main/java/com/nuodb/controlplane/util/OtelTrace.java`:

```
package com.nuodb.controlplane.util;

public @interface OtelTrace {

}
```

Add `@OtelTrace` to each method in `nuodb-control-plane/rest-service/src/main/java/com/nuodb/controlplane/client/ResourceManagerImpl.java` or other desired locations

- To search for traces or metrics, go to the URL: `/ui/monitoring` and select appropriate service.

## Run new E2E tests via Playwright
```
cd ui
docker run -p 3001:3001 --rm --init -it --workdir /home/pwuser --user pwuser mcr.microsoft.com/playwright:v1.58.2-noble /bin/sh \
    -c "npx -y playwright@1.58.2 run-server --port 3001 --host 0.0.0.0"

PW_TEST_CONNECT_WS_ENDPOINT=ws://127.0.0.1:3001/ \
PLAYWRIGHT_HTML_HOST=0.0.0.0 \
npm run e2e -- --project=chromium
```
