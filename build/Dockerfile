FROM node:9.7.1

LABEL author="Yacov Malen"
LABEL client_version=0.0.1

ENV SERVER_PORT=${SERVER_PORT:-3000}
ENV CLIENT_ID=${CLIENT_ID}
ENV DEBUG=${DEBUG:-false}

EXPOSE ${SERVER_PORT}

RUN mkdir -p /src/app
COPY . /src/app

WORKDIR /src/app

RUN npm install

ENTRYPOINT ["npm", "run"]
CMD ["start-client"]