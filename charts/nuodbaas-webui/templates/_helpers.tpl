{{/*
(C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.
*/}}


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
{{ include "nuodbaas-webui.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "nuodbaas-webui.selectorLabels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
