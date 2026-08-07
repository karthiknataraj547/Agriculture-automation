const { execSync } = require('child_process');
const fs = require('fs');

console.log('[Build Pipeline] Starting monorepo build...');

// Dynamically locate repository root
if (fs.existsSync('packages/shared')) {
  console.log('[Build Pipeline] Currently at monorepo root.');
} else if (fs.existsSync('../../packages/shared')) {
  console.log('[Build Pipeline] Navigating up 2 levels to monorepo root.');
  process.chdir('../..');
} else if (fs.existsSync('../packages/shared')) {
  console.log('[Build Pipeline] Navigating up 1 level to monorepo root.');
  process.chdir('..');
}

// Build shared package
console.log('[Build Pipeline] Building @aether/shared package...');
execSync('npm install --prefix packages/shared && npm run build --prefix packages/shared', { stdio: 'inherit' });

// Navigate to apps/frontend and build Next.js
console.log('[Build Pipeline] Navigating to apps/frontend...');
process.chdir('apps/frontend');

console.log('[Build Pipeline] Installing frontend dependencies and building Next.js 14 bundle...');
execSync('npm install && npm run build', { stdio: 'inherit' });

console.log('[Build Pipeline] Production build completed successfully!');
process.exit(0);
