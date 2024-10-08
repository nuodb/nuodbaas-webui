# Release Process

Official releases are available here:

[Docker Images](github.com/nuodb/nuodbaas-webui/container/nuodbaas-webui)
[Helm Charts](https://github.com/nuodb/nuodbaas-webui/blob/gh-pages/index.yaml)

The release version numbers are defined in `/charts/nuodbaas-webui/Chart.yaml` in the `version` and `appVersion` attributes.
The `major` and `minor` versions MUST match, but the patch version can be different (and will diverge).
The `version` and `appVersion` attributes need to be in the `MAJOR.MINOR.PATCH` version format (i.e. 1.0.0)

## Creating a MAJOR or MINOR release

Follow these steps:
- in the development environment, create a branch `rel/<MAJOR>.<MINOR>`, i.e. `rel/1.0`. Note that it MUST NOT have a `patch` version.
- modify `charts/nuodbaas-webui/Chart.yaml` and change `appVersion` and `version` to `<MAJOR>.<MINOR>.0`, i.e. `1.0.0`
- commit and push the branch
- once pushed, the build process will automatically create and publish the release helm chart / docker image

## Creating a PATCH release

Follow these steps:
- switch to the `rel/<MAJOR>.<MINOR>` branch which should contain all the commits for this patch release
- to patch the helm chart, modify `charts/nuodbaas-webui/Chart.yaml` and change `version` to `<MAJOR>.<MINOR>.<PATCH>`, i.e. `1.0.1`
- to patch the docker image, modify `charts/nuodbaas-webui/Chart.yaml` and change `appVersion` to `<MAJOR>.<MINOR>.<PATCH>`, i.e. `1.0.2`
- commit and push the branch
- once pushed, the build process will automatically create and publish the release helm chart / docker image

## Subsequent code changes pushed to main or rel/* branches

All the code changes pushed to the `main` and `rel/*` branches will be published in the docker and helm registries with specific tags.

If code is submitted with a version which doesn't exist in the docker/helm repositories, it is assumed this push is the first release and will have following tags:

```
Docker Images: <MAJOR>.<MINOR>.<PATCH>
               <MAJOR>.<MINOR>.<PATCH>-latest
Helm Charts: <MAJOR>.<MINOR>.<PATCH>
             <MAJOR>.<MINOR>.<PATCH>-latest
```

If the version exists in the repository already, it will add additional information to the tags to represent "daily" or similar builds (i.e. future hotfixes)
Older versions might be deleted automatically at some point (TBD)

```
Docker Images: <MAJOR>.<MINOR>.<PATCH>-<GIT_SHA>
               <MAJOR>.<MINOR>.<PATCH>-latest
Helm Charts: <MAJOR>.<MINOR>.<PATCH>-<HELM_CONTENT_HASH>+<GIT_SHA>
             <MAJOR>.<MINOR>.<PATCH>-latest
```

Note: Helm charts will only be updated in the repository if the helm chart content changes (i.e. versions, variables, deployments, ...)
