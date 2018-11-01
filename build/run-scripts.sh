#! /bin/sh

docker run -d --network=host -p 27017:27017 mongo:3.6

cd .. && docker build -f ./build/Dockerfile -t vend --rm .

docker run -d --network=host -p 3000:3000 vend start-server && sleep 3 && docker run -it --network=host -e CLIENT_ID=4321 vend start-client