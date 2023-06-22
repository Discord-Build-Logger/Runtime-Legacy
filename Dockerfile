FROM node:18

WORKDIR /usr/src/runtime
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

RUN npx prisma generate

COPY . .

EXPOSE 8080

# need to run `npx prisma db push` after database service is running.
CMD ["./sync-and-run.sh"]
ENTRYPOINT ["/bin/bash"]
