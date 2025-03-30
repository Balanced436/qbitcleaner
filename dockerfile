FROM node:19
WORKDIR /app
COPY . .
RUN npm install
RUN chmod +x entrypoint.sh

ENTRYPOINT ["/bin/sh", "./entrypoint.sh"]