#!/bin/bash
set -e

source ~/nodevenv/tabuh-studio-dev/backend/20/bin/activate

echo "── Pulling latest code ──"
cd ~/tabuh-studio-dev
git pull origin develop

echo "── Installing dependencies ──"
cd backend
npm install --include=dev

echo "── Building backend ──"
npm run build

echo "── Restarting Passenger ──"
touch tmp/restart.txt

echo "── Done ──"
