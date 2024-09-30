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
