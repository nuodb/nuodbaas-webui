# NuoDB DBaaS User Interface Helm Chart

This chart starts a NuoDB User Interface deployment on a Kubernetes cluster using the Helm package manager.

## Command

```bash
helm install [name] charts/nuodbaas-webui [--generate-name] [--set parameter] [--values myvalues.yaml]
```

## Installing the Chart

All configurable parameters for each top-level scope are detailed below, organized by scope.

| Parameter | Description | Default |
| ----- | ----------- | ------ |
| `nuodbaasWebui.replicaCount` | Number of replicas | `1` |
| `nuodbaasWebui.image.repository` | NuoDBaaS WebUI container image repository |`ghcr.io/nuodb/nuodb-cp-images`|
| `nuodbaasWebui.image.pullPolicy` | NuoDBaaS WebUI container pull policy |`IfNotPresent`|
| `nuodbaasWebui.image.pullSecrets` | Specify docker-registry secret names as an array | `[]` |
| `nuodbaasWebui.resources.limits.cpu` | Specify cpu limit | `100m` |
| `nuodbaasWebui.resources.limits.memory` | Specify memory limit | `128Mi` |
| `nuodbaasWebui.resources.requests.cpu` | Specify cpu requests | `100m` |
| `nuodbaasWebui.resources.requests.memory` | Specify memory requests | `128Mi` |
| `nuodbaasWebui.service.type` | Specify service type | `ClusterIP` |
| `nuodbaasWebui.pathPrefix` | Specify NuoDBaaS WebUI prefix | `ui` |
| `nuodbaasWebui.cpUrl` | The URL used to send requests to the Control Plane REST service | `nuodb-cp` |

## Uninstalling the Chart

To uninstall/delete the deployment

```bash
helm delete <helm release name>
```

The command removes all the Kubernetes components associated with the chart and deletes the release.
