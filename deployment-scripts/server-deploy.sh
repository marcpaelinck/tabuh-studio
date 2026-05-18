#!/bin/bash
set -e

source ~/nodevenv/tabuh-studio/backend/20/bin/activate

echo "── Pulling latest code ──"
cd ~/tabuh-studio
git pull origin add-backend-project

echo "── Installing dependencies ──"
cd backend
npm install --include=dev

echo "── Building backend ──"
npm run build

echo "── Restarting Passenger ──"
touch tmp/restart.txt

echo "── Done ──"