#!/bin/bash
set -e

echo "── Building frontend locally ──"
cd frontend
npm run build
cd ..

echo "── Uploading frontend to server ──"
rsync -avz --delete frontend/dist/ xc113049@tabuh.studio:~/tabuh-studio/frontend-dist/

echo "── Triggering backend deployment ──"
ssh yourusername@tabuh.studio 'bash ~/tabuh-studio/deploy-server.sh'

echo "── Done ──"