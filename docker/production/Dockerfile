# (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved.

FROM node:18-alpine AS build-ui
WORKDIR /app/
ARG REACT_APP_GIT_SHA
COPY ui/ /app/
RUN npm install
RUN npm run build

FROM nginx:alpine
COPY --from=build-ui /app/build /usr/share/nginx/html/ui/
RUN cp /usr/share/nginx/html/ui/index.html /usr/share/nginx/html/
COPY docker/production/files/ /
HEALTHCHECK --interval=1s --timeout=3s --start-period=5s --retries=3 CMD [ "curl", "http://localhost/" ]
EXPOSE 80
ENTRYPOINT [ "/entrypoint.sh" ]
