# NuoDBaaS WebUI Helm Chart

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
| `nuodbaasWebui.image.repository` | NuoDBaaS WebUI container image repository |`253548315642.dkr.ecr.us-east-1.amazonaws.com/nuodbaas-webui-docker`|
| `nuodbaasWebui.image.pullPolicy` | NuoDBaaS WebUI container pull policy |`IfNotPresent`|
| `nuodbaasWebui.image.pullSecrets` | Specify docker-registry secret names as an array | `[]` |
| `nuodbaasWebui.ingress.className` | Class name of the ingress to use | `""` |
| `nuodbaasWebui.resources.limits.cpu` | Specify cpu limit | `100m` |
| `nuodbaasWebui.resources.limits.memory` | Specify memory limit | `128Mi` |
| `nuodbaasWebui.resources.requests.cpu` | Specify cpu requests | `100m` |
| `nuodbaasWebui.resources.requests.memory` | Specify memory requests | `128Mi` |
| `nuodbaasWebui.service.type` | Specify service type | `ClusterIP` |
| `nuodbaasWebui.service.port` | The service HTTP port for exposing Control Plane REST | `8080` |
| `nuodbaasWebui.service.annotations` | Service annotations useful for integrating 3rd party products. Map value will pass through to the pod as supplied. String value will be templated and the result is passed. | `{}` |
| `nuodbaasWebui.pathPrefix` | Specify NuoDBaaS WebUI prefix | `ui` |
| `nuodbaasWebui.pathPrefixAlternate` | Specify alternate NuoDBaaS WebUI prefix | `webui` |
| `nuodbaasWebui.cpUrl` | The URL used to send requests to the Control Plane REST service | `/nuodb-cp` |
| `nuodbaasWebui.ephemeralVolume.enabled` |  Whether to create a generic ephemeral volume rather than emptyDir for any storage that does not outlive the pod | `false` |
| `nuodbaasWebui.ephemeralVolume.size` |  The size of the generic ephemeral volume to create | `1Gi` |
| `nuodbaasWebui.ephemeralVolume.storageClass` |  The storage class to use for the generic ephemeral volume | `""` |

## Uninstalling the Chart

To uninstall/delete the deployment

```bash
helm delete <helm release name>
```

The command removes all the Kubernetes components associated with the chart and deletes the release.
