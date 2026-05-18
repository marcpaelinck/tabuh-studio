#!/bin/bash
SSH_CMD="ssh -p 26"
REMOTE="xc113049@tabuh.studio"
DEPLOY_DOMAIN="dev.tabuh.studio"

echo "── Building frontend locally ──"
cd frontend
npm run build
cd ..

echo "── Uploading frontend build to server ──"
rsync -avz --delete -e "$SSH_CMD" frontend/dist/ $REMOTE:~/tabuh-studio/frontend-dist/

## echo "── Triggering backend deployment ──"
## ssh -p 26 $REMOTE 'bash ~/tabuh-studio/deploy-server.sh'

echo "── Done ──"
echo "── App available at https://$DEPLOY_DOMAIN ──"