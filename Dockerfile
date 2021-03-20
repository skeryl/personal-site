FROM node:12
RUN mkdir -p /usr/src/personal-site
COPY . /usr/src/personal-site/
WORKDIR /usr/src/personal-site/personal-site-server
EXPOSE 3000 80 443
CMD [ "npm", "run", "start" ]
