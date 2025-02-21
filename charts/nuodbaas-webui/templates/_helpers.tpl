{{/*
(C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.
*/}}

{{/*
Expand the name of the chart.
*/}}
{{- define "nuodbaas-webui.name" -}}
{{- default .Chart.Name .Values.nuodbaasWebui.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "nuodbaas-webui.fullname" -}}
{{- if .Values.nuodbaasWebui.fullnameOverride }}
{{- (tpl .Values.nuodbaasWebui.fullnameOverride .) | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nuodbaasWebui.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "nuodbaas-webui.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "nuodbaas-webui.labels" -}}
helm.sh/chart: {{ include "nuodbaas-webui.chart" . }}
{{- include "nuodbaas-webui.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: {{ include "nuodbaas-webui.name" . }}
{{- with .Values.resourceLabels }}
{{- include "nuodbaas-webui.toYaml" (list $ .) }}
{{- end }}
{{- end }}

{{/*
Selector labels. The selector labels are immutable.
*/}}
{{- define "nuodbaas-webui.selectorLabels" -}}
{{- $current := lookup "apps/v1" "Deployment" .Release.Namespace (include "nuodbaas-webui.fullname" .) -}}
{{- if $current }}
{{ toYaml (index $current "spec" "selector" "matchLabels") }}
{{- else }}
app.kubernetes.io/name: {{ include "nuodbaas-webui.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: "webui-service"
app: {{ include "nuodbaas-webui.fullname" . }}
group: nuodb
{{- end }}
{{- end }}

{{/*
Pod labels
*/}}
{{- define "nuodbaas-webui.podLabels" -}}
{{- with .Values.nuodbaasWebui.podLabels }}
{{- include "nuodbaas-webui.toYaml" (list $ .) }}
{{- end }}
{{- end }}

{{/*
Pod annotations
*/}}
{{- define "nuodbaas-webui.podAnnotations" -}}
{{- with .Values.nuodbaasWebui.podAnnotations }}
{{- include "nuodbaas-webui.toYaml" (list $ .) }}
{{- end }}
{{- end }}

{{/*
Renders the supplied value as YAML. If the value is string, it is templated
first. This allows late binding of Helm values into labels and annotations.
*/}}
{{- define "nuodbaas-webui.toYaml" -}}
{{- $root := index . 0 -}}
{{- $v := index . 1 -}}
{{- if kindIs "string" $v }}
{{ tpl $v $root }}
{{- else }}
{{ toYaml $v }}
{{- end }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "nuodbaas-webui.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "nuodbaas-webui.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Backend for ingress rules
*/}}
{{- define "nuodbaas-webui.ingress.backend" -}}
{{- if .Capabilities.APIVersions.Has "networking.k8s.io/v1/Ingress" -}}
service:
  name: {{ include "nuodbaas-webui.fullname" . }}
  port:
    number: {{ .Values.nuodbaasWebui.service.port }}
{{- else -}}
serviceName: {{ include "nuodbaas-webui.fullname" . }}
servicePort: {{ .Values.nuodbaasWebui.service.port }}
{{- end }}
{{- end }}

{{/*
Readiness or liveness probe for WebUI service
*/}}
{{- define "nuodbaas-webui.probe" -}}
{{ include "nuodbaas-webui.httpProbe" . }}
{{- end }}

{{/*
HTTP probe to check readiness of WebUI service
*/}}
{{- define "nuodbaas-webui.httpProbe" -}}
httpGet:
  path: /
  port: http-alt
{{- end }}

{{/*
Return the API version of the HorizontalPodAutoscaler kind
*/}}
{{- define "hpa.apiVersion" -}}
{{- if .Capabilities.APIVersions.Has "autoscaling/v2/HorizontalPodAutoscaler" -}}
autoscaling/v2
{{- else -}}
autoscaling/v2beta1
{{- end -}}
{{- end -}}

{{/*
Return the target average utilization resource entries of the HorizontalPodAutoscaler
*/}}
{{- define "hpa.targetAverageUtilization" -}}
{{- range $name, $value := .Values.nuodbaasWebui.autoscaling.targetAverageUtilization }}
- type: Resource
  resource:
    name: {{ $name }}
    {{- if $.Capabilities.APIVersions.Has "autoscaling/v2/HorizontalPodAutoscaler" }}
    target:
      type: Utilization
      averageUtilization: {{ $value }}
    {{- else }}
    targetAverageUtilization: {{ $value }}
    {{- end -}}
{{- end -}}
{{- end -}}
