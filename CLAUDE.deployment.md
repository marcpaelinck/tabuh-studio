# Tabuh Studio — Deployment Guide

## Prerequisites

- SSH access on port 26
- cPanel access
- Local machine with Node.js, npm and rsync installed
- Domain: `tabuh.studio` (or `dev.tabuh.studio` for testing)

---

## Phase 1 — Server setup (one time only)

### 1.1 — Enable SSL

In cPanel → **SSL/TLS** → **Let's Encrypt SSL** → issue a certificate for your domain.

### 1.2 — Create the MySQL database

In cPanel → **MySQL Databases**:

1. Create database: `tabuhstudio_gamelan`
2. Create user: `tabuhstudio_user` with a strong password
3. Add user to database with **All Privileges**
4. Open **phpMyAdmin** → select the database → **SQL** tab → run the schema:

```sql
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('public','editor','admin') NOT NULL DEFAULT 'public',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE instrument_sets (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  tuning     JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE scores (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  owner_id       INT NOT NULL,
  instrument_set VARCHAR(100) NOT NULL,
  title          VARCHAR(200) NOT NULL,
  content        JSON NOT NULL,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE score_permissions (
  score_id  INT NOT NULL,
  user_id   INT NOT NULL,
  can_edit  TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (score_id, user_id),
  FOREIGN KEY (score_id) REFERENCES scores(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
);

CREATE INDEX idx_scores_owner ON scores(owner_id);
CREATE INDEX idx_score_permissions_user ON score_permissions(user_id);
```

### 1.3 — Set up Node.js app in cPanel

In cPanel → **Setup Node.js App** → **Create Application**:

| Setting | Value |
|---|---|
| Node.js version | 20.19.4 |
| Application mode | Production |
| Application root | `tabuh-studio/backend` |
| Application URL | `dev.tabuh.studio` (or `tabuh.studio`) |
| Application startup file | `dist/index.js` |

Click **Create**. Note the virtual environment path shown — something like:

```
/home/xc113049/nodevenv/tabuh-studio/backend/20/bin/activate
```

### 1.4 — Set up the .htaccess in the domain document root

```bash
cat > ~/domains/dev.tabuh.studio/public_html/.htaccess << 'EOF'
PassengerAppRoot "/home/xc113049/tabuh-studio/backend"
PassengerBaseURI "/"
PassengerNodejs "/home/xc113049/nodevenv/tabuh-studio/backend/20/bin/node"
PassengerAppType node
PassengerStartupFile dist/index.js
EOF
```

### 1.5 — Clone the repository

```bash
ssh -p 26 xc113049@tabuh.studio
cd ~
git clone https://github.com/yourusername/tabuh-studio.git
```

If the folder already exists from cPanel:

```bash
cd ~/tabuh-studio
git init
git remote add origin https://github.com/yourusername/tabuh-studio.git
git fetch origin main
git pull origin main
```

### 1.6 — Create the .env file

```bash
nano ~/tabuh-studio/backend/.env
```

```env
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_USER=tabuhstudio_user
DB_PASSWORD=your-database-password
DB_NAME=tabuhstudio_gamelan
JWT_SECRET=your-long-random-secret
JWT_REFRESH_SECRET=your-different-long-random-secret
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
CORS_ORIGIN=https://dev.tabuh.studio
ADMIN_EMAIL=your@email.com
SCORES_FOLDER=/home/xc113049/tabuh-studio/backend/scores
RATE_LIMIT_MAX=500
```

Generate JWT secrets — run this twice, once for each secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 1.7 — Create the frontend-dist folder

```bash
mkdir ~/tabuh-studio/frontend-dist
```

### 1.8 — Create the deploy scripts

**On the server** — create `~/tabuh-studio/deploy-server.sh`:

```bash
cat > ~/tabuh-studio/deploy-server.sh << 'EOF'
#!/bin/bash
set -e

source ~/nodevenv/tabuh-studio/backend/20/bin/activate

echo "── Pulling latest code ──"
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
EOF

chmod +x ~/tabuh-studio/deploy-server.sh
```

**On your local machine** — create `deploy-local.sh` in the repo root:

```bash
#!/bin/bash
set -e

SSH_CMD="ssh -p 26"
REMOTE="xc113049@tabuh.studio"
DEPLOY_DOMAIN="dev.tabuh.studio"

echo "── Building frontend locally ──"
cd frontend
npm run build
cd ..

echo "── Uploading frontend build to server ──"
rsync -avz --delete -e "$SSH_CMD" frontend/dist/ $REMOTE:~/tabuh-studio/frontend-dist/

echo "── Triggering backend deployment ──"
ssh -p 26 $REMOTE 'bash ~/tabuh-studio/deploy-server.sh'

echo "── Done ──"
echo "── App available at https://$DEPLOY_DOMAIN ──"
```

```bash
chmod +x deploy-local.sh
```

---

## Phase 2 — Initial deployment

### 2.1 — Build and deploy from local machine

```bash
./deploy-local.sh
```

### 2.2 — Seed the production database

```bash
ssh -p 26 xc113049@tabuh.studio
source ~/nodevenv/tabuh-studio/backend/20/bin/activate
cd ~/tabuh-studio/backend

# Create admin user
node dist/seed/createAdminUser.js

# Migrate scores
node dist/seed/migrateScores.js
```

> **Note:** If your JSON score files are not yet on the server, upload them first from your local machine:
> ```bash
> scp -P 26 /path/to/scores/*.json xc113049@tabuh.studio:~/tabuh-studio/backend/scores/
> ```

---

## Phase 3 — Verify deployment

### 3.1 — Test health endpoint

```bash
curl https://dev.tabuh.studio/api/health
```

Should return `{"status":"ok"}`.

### 3.2 — Test in browser

Open `https://dev.tabuh.studio` in an incognito window and verify:

- React app loads correctly
- Fonts render correctly
- Score list populates
- Score playback works
- Login works

---

## Phase 4 — Subsequent deployments

For all future deployments, just run from your local machine:

```bash
./deploy-local.sh
```

This automatically:

1. Builds the frontend locally
2. Uploads the frontend build to the server
3. Pulls latest backend code on the server
4. Installs dependencies
5. Compiles TypeScript
6. Restarts Passenger

---

## Phase 5 — Going live on tabuh.studio

When ready to switch from `dev.tabuh.studio` to `tabuh.studio`:

**1. Update the Node.js app in cPanel**

In cPanel → **Setup Node.js App** → **Edit** → change Application URL to `tabuh.studio`.

**2. Update the .htaccess on tabuh.studio**

```bash
cat > ~/domains/tabuh.studio/public_html/.htaccess << 'EOF'
PassengerAppRoot "/home/xc113049/tabuh-studio/backend"
PassengerBaseURI "/"
PassengerNodejs "/home/xc113049/nodevenv/tabuh-studio/backend/20/bin/node"
PassengerAppType node
PassengerStartupFile dist/index.js
EOF
```

**3. Update CORS_ORIGIN in .env**

```bash
nano ~/tabuh-studio/backend/.env
# Change: CORS_ORIGIN=https://tabuh.studio
```

**4. Update deploy-local.sh locally**

```bash
# Change: DEPLOY_DOMAIN="tabuh.studio"
```

**5. Restart Passenger**

```bash
touch ~/tabuh-studio/backend/tmp/restart.txt
```

---

## Troubleshooting

### 503 Service Unavailable

Passenger didn't start. Check the error log:

```bash
tail -50 ~/domains/dev.tabuh.studio/logs/error_log
```

Or restart via cPanel → **Setup Node.js App** → **Stop** then **Start**.

### Too many requests

Rate limit hit. Wait 15 minutes or increase `RATE_LIMIT_MAX` in `.env` and restart Passenger.

### Fonts showing as text/html

Font files not found by Express. Verify the files exist and are being served correctly:

```bash
find ~/tabuh-studio/frontend-dist -name "*.woff2"
curl -I https://dev.tabuh.studio/fonts/BaliMusic5-spaced.woff2
```

### Old cached page showing

Clear the LiteSpeed cache:

```bash
rm -rf ~/lscache/*
mkdir ~/lscache
```

### TypeScript build errors on server

Dev dependencies not installed. Run:

```bash
source ~/nodevenv/tabuh-studio/backend/20/bin/activate
cd ~/tabuh-studio/backend
npm install --include=dev
npm run build
```

### Score content returned as string

MySQL JSON columns are not always auto-parsed by `mysql2`. The manual parse guard in the `GET /:id` route handles this automatically:

```typescript
if (typeof record.content === 'string') {
  record.content = JSON.parse(record.content);
}
```

### npm install creates local node_modules folder

CloudLinux requires node modules to be stored in the virtual environment. If `npm install` or `npm prune` creates a local `node_modules` folder in the backend root, delete it:

```bash
rm -rf ~/tabuh-studio/backend/node_modules
```

Then reinstall using the virtual environment:

```bash
source ~/nodevenv/tabuh-studio/backend/20/bin/activate
npm install --include=dev
```

Never run `npm prune` on this server — it conflicts with CloudLinux's module management.

### Passenger not picking up code changes

If `touch tmp/restart.txt` doesn't restart the app, force it via cPanel:

- cPanel → **Setup Node.js App** → **Stop** → wait 10 seconds → **Start**

Then clear the LiteSpeed cache as well.

---

## Notes

- The `.env` file is never committed to Git — manage it directly on the server
- The `frontend-dist/` folder is never committed to Git — it is always built locally and uploaded via rsync
- SSH connections require port 26: always use `ssh -p 26` and `rsync -e "ssh -p 26"`
- The virtual environment must be activated before running any Node.js or npm commands on the server: `source ~/nodevenv/tabuh-studio/backend/20/bin/activate`
- Passenger ignores the `PORT` environment variable — the app is always accessed through the domain, never via `localhost:3001`
- LiteSpeed Cache can serve stale pages aggressively — always clear it after deployment if changes don't appear
