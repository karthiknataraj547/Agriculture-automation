#!/usr/bin/env bash
set -e

# Navigate to monorepo root dynamically if in subfolder
if [ -d "packages/shared" ]; then
  true
elif [ -d "../../packages/shared" ]; then
  cd ../..
elif [ -d "../packages/shared" ]; then
  cd ..
fi

# Build shared package dependencies and TypeScript definitions
npm install --prefix packages/shared
npm run build --prefix packages/shared

# Navigate into apps/frontend, install dependencies and build Next.js 14
cd apps/frontend
npm install
npm run build
