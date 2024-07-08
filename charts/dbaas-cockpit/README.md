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
| `replicaCount` | Number of replicas | `1` |
| `image.repository` | NuoDB Control Plane container image repository |`ghcr.io/nuodb/nuodb-cp-images`|
| `image.tag` | NuoDB Control Plane container image tag | `""` |
| `image.pullPolicy` | NuoDB Control Plane container pull policy |`IfNotPresent`|
| `image.pullSecrets` | Specify docker-registry secret names as an array | `[]` |
| `resources.limits.cpu` | Specify cpu limit | `100m` |
| `resources.limits.memory` | Specify memory limit | `128Mi` |
| `resources.requests.cpu` | Specify cpu requests | `100m` |
| `resources.requests.memory` | Specify memory requests | `128Mi` |
| `service.type` | Specify service type | `ClusterIP` |

## Uninstalling the Chart

To uninstall/delete the deployment

```bash
helm delete <helm release name>
```

The command removes all the Kubernetes components associated with the chart and deletes the release.
