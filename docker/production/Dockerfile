FROM node:18-alpine AS build-ui
WORKDIR /app/
COPY ui/public/ /app/public
COPY ui/src/ /app/src
COPY ui/package.json /app/
RUN npm install
RUN npm run build

FROM nginx:alpine
COPY --from=build-ui /app/build /usr/share/nginx/html
COPY docker/production/files/ /
EXPOSE 80
CMD [ "nginx", "-g", "daemon off;" ]
