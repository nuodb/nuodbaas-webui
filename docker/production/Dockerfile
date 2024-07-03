FROM node:18-alpine AS build
WORKDIR /app/
COPY ui/public/ /app/public
COPY ui/src/ /app/src
COPY ui/package.json /app/
RUN npm install
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY docker/production/files/ /
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
