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

### Setup UI

```
cd dbaas-cockpit
make run-dev
```

### Access the UI

```
Open in the browser at http://localhost:81/
Username: acme/user1
Password: passw0rd
```
