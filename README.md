# dbaas-cockpit

User Interface to the DBaaS Rest service (nuodb-control-plane)

## Setup in a development environment

The following steps set up `nuodb-control-plane` as well as `dbaas-cockpit` in debug mode with an `nginx` reverse proxy to work around CORS issues connecting the UI to the REST service.

### Clone necessary GIT repositories if not done already:

```
git clone git@github.com:nuodb/nuodb-control-plane
git clone git@github.com:nuodb/dbaas-cockpit
```

### Option 1: Setup Control plane (in Debug Mode)

```
cd nuodb-control-plane
make install
```

In your IDE, run the following Java program (potentially in Debug mode):

```
mainClass: com.nuodb.controlplane.Main
args: ["server", "start"]
```

### Option 2: Setup Control plane (in Kubernetes Cluster)

```
cd nuodb-control-plane
make deploy
kubectl port-forward svc/nuodb-cp-rest 8080 &
```

### Setup and run UI

```
cd dbaas-cockpit
make run-dev
```

### Access the UI

```
Open in the browser at http://localhost:81/
Username: acme/admin
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
