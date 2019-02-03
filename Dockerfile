FROM node:8
RUN mkdir -p /usr/src/personal-site
WORKDIR /usr/src/personal-site
COPY . .
EXPOSE 3000
WORKDIR /usr/src/personal-site/personal-site-server
CMD [ "npm", "run", "start" ]
