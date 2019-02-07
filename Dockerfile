FROM node:8
COPY . .
EXPOSE 3000
CMD [ "npm", "run", "start" ]
