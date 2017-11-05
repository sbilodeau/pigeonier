FROM node:8

WORKDIR /usr/src/app

COPY package.json bower.json .bowerrc .npmrc ./

RUN npm install -q

COPY . ./

ENV PORT 8000
ENV SECURE_PORT 8443

EXPOSE 8000
EXPOSE 8443

ENV VMS_AUTH_PATH  /run/auth
ENV VMS_MEDIA_PATH /run/medias

VOLUME /run/auth

CMD ["node", "main"]
