#!/bin/bash

echo "Setting up Contexto monorepo..."

# Remove old directories that have been moved to packages
echo "Cleaning up old structure..."
rm -rf src/
rm -f vite.config.ts
rm -f dataSource.ts
rm -f env.ts
rm -f setup.ts
rm -f test-snowflake.ts
rm -rf tests/

# Install dependencies for all packages
echo "Installing dependencies..."
npm install

echo "Setup complete! 🎉"
echo ""
echo "Available commands:"
echo "  npm run dev:server   - Start server in development mode"
echo "  npm run dev:web      - Start web frontend in development mode"
echo "  npm run dev:bot      - Start Discord bot in development mode"
echo "  npm run setup        - Setup database"
echo ""
echo "Make sure to:"
echo "1. Create a .env file with your configuration"
echo "2. Run 'npm run setup' to initialize the database"
