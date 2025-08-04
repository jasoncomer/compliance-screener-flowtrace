#!/bin/bash

# Load NVM and use the correct Node.js version
export NVM_DIR="$HOME/.nvm"
# This loads nvm
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
# This loads nvm bash_completion
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# Navigate to the application directory
cd /home/ubuntu/blockscout-api

# Pull the latest changes (if using Git on the server)
./git-ops.sh pull

# Install dependencies (if needed)
npm install

npm run build

# stop the application
pm2 stop blockscout-api

pm2 start /home/ubuntu/blockscout-api/dist/src/server.js --name blockscout-api
