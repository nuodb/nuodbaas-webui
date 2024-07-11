# NuoDB DBaaS User Interface Helm Chart

This chart starts a NuoDB User Interface deployment on a Kubernetes cluster using the Helm package manager.

## Command

```bash
helm install [name] charts/dbaas-cockpit [--generate-name] [--set parameter] [--values myvalues.yaml]
```

## Installing the Chart

All configurable parameters for each top-level scope are detailed below, organized by scope.

| Parameter | Description | Default |
| ----- | ----------- | ------ |
| `dbaasCockpit.replicaCount` | Number of replicas | `1` |
| `dbaasCockpit.image.repository` | NuoDB Cockpit UI container image repository |`ghcr.io/nuodb/nuodb-cp-images`|
| `dbaasCockpit.image.tag` | NuoDB Cockpit UI container image tag | `""` |
| `dbaasCockpit.image.pullPolicy` | NuoDB Cockpit UI container pull policy |`IfNotPresent`|
| `dbaasCockpit.image.pullSecrets` | Specify docker-registry secret names as an array | `[]` |
| `dbaasCockpit.resources.limits.cpu` | Specify cpu limit | `100m` |
| `dbaasCockpit.resources.limits.memory` | Specify memory limit | `128Mi` |
| `dbaasCockpit.resources.requests.cpu` | Specify cpu requests | `100m` |
| `dbaasCockpit.resources.requests.memory` | Specify memory requests | `128Mi` |
| `dbaasCockpit.service.type` | Specify service type | `ClusterIP` |
| `cpRest.ingress.pathPrefix` | The prefix used by the Ingress controller to route requests to the Control Plane REST service | `nuodb-cp` |

## Uninstalling the Chart

To uninstall/delete the deployment

```bash
helm delete <helm release name>
```

The command removes all the Kubernetes components associated with the chart and deletes the release.
