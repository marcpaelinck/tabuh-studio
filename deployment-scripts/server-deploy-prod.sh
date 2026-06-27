#!/bin/bash
set -e

source ~/nodevenv/tabuh-studio/backend/20/bin/activate

echo "── Pulling latest code for production ──"
cd ~/tabuh-studio
git pull origin main

echo "── Installing dependencies ──"
cd backend
npm install --include=dev

echo "── Building backend ──"
npm run build

echo "── Restarting Passenger ──"
touch tmp/restart.txt

echo "── Done ──"
