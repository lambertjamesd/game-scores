from node:16.4

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY src src
COPY index.js index.js

CMD ["npm", "run", "server"]