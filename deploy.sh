#!/bin/bash

# Exit on any error
set -e

echo "Starting deployment setup for KhataBook CRM..."

# 1. Update and install dependencies
echo "Installing Node.js, npm, and other dependencies..."
sudo apt update

# Install Node.js LTS (if not installed)
if ! command -v node > /dev/null; then
    echo "Node.js not found. Installing Node.js LTS..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "Node.js is already installed: $(node -v)"
fi

# Install PM2 globally
if ! command -v pm2 > /dev/null; then
    echo "Installing PM2 globally..."
    sudo npm install -g pm2
else
    echo "PM2 is already installed."
fi

# 2. Setup project directories
APP_DIR=$(pwd)
BACKEND_DIR="$APP_DIR/khatabook-api"
FRONTEND_DIR="$APP_DIR/khatabook-frontend"

echo "Using application directory: $APP_DIR"

# 3. Build & Run Backend (NestJS)
echo "Setting up CRM Backend (NestJS)..."
cd "$BACKEND_DIR"

echo "Installing backend dependencies..."
npm install

echo "Building backend..."
npm run build

echo "Starting backend with PM2 on port 3000..."
# Ensure PM2 loads the environment variables
pm2 start dist/main.js --name "crm-backend" --env PORT=3000

# 4. Build & Run Frontend (Next.js)
echo "Setting up CRM Frontend (Next.js)..."
cd "$FRONTEND_DIR"

echo "Installing frontend dependencies..."
npm install

echo "Building frontend..."
npm run build

echo "Starting frontend with PM2 on port 3001..."
pm2 start npm --name "crm-frontend" -- start -- -p 3001

# 5. Save PM2 configuration to run on startup
echo "Configuring PM2 to start on boot..."
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp /home/$USER || true
pm2 save

# 6. Configure Nginx Reverse Proxy for CRM
echo "Configuring Nginx for CRM..."

cat <<EOF | sudo tee /etc/nginx/sites-available/crm
# CRM Frontend (Next.js)
server {
    listen 80;
    server_name app.miteklabs.tech;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # WebSocket support for Next.js
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# CRM Backend (NestJS)
server {
    listen 80;
    server_name api.miteklabs.tech;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# 7. Enable Nginx Site and Restart
echo "Enabling Nginx configuration..."
sudo ln -sf /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/

echo "Testing Nginx configuration..."
sudo nginx -t

echo "Restarting Nginx..."
sudo systemctl restart nginx

# 8. Setup SSL with Let's Encrypt (Certbot)
echo "Setting up SSL for app.miteklabs.tech and api.miteklabs.tech..."

# We assume certbot and python3-certbot-nginx are already installed from the chatbot setup
sudo certbot --nginx -d app.miteklabs.tech -d api.miteklabs.tech \
    --non-interactive \
    --agree-tos \
    --register-unsafely-without-email \
    --redirect \
    --keep-until-expiring

echo "Deployment complete!"
echo "Next.js Frontend: https://app.miteklabs.tech"
echo "NestJS Backend:   https://api.miteklabs.tech"
echo "Chatbot should remain unaffected at chatbot.miteklabs.tech"
