#!/usr/bin/env node

/**
 * Production Build Verification Script
 * Verifies that the production build is ready for deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Verifying production build for Intent-Driven Cold Outreach Agent...\n');

const checks = [
  {
    name: 'Package.json exists',
    check: () => fs.existsSync('package.json'),
    fix: 'Ensure package.json is present in the root directory'
  },
  {
    name: 'TypeScript config exists',
    check: () => fs.existsSync('tsconfig.json'),
    fix: 'Ensure tsconfig.json is present in the root directory'
  },
  {
    name: 'Source directory exists',
    check: () => fs.existsSync('src') && fs.statSync('src').isDirectory(),
    fix: 'Ensure src/ directory exists with source code'
  },
  {
    name: 'Environment template exists',
    check: () => fs.existsSync('.env.example'),
    fix: 'Create .env.example file with configuration template'
  },
  {
    name: 'Pre-production config exists',
    check: () => fs.existsSync('.env.preprod'),
    fix: 'Create .env.preprod file with pre-production configuration'
  },
  {
    name: 'Dependencies installed',
    check: () => fs.existsSync('node_modules'),
    fix: 'Run: npm install'
  },
  {
    name: 'TypeScript compilation',
    check: () => {
      try {
        execSync('npm run type-check', { stdio: 'pipe' });
        return true;
      } catch {
        return false;
      }
    },
    fix: 'Fix TypeScript compilation errors'
  },
  {
    name: 'Linting passes',
    check: () => {
      try {
        execSync('npm run lint', { stdio: 'pipe' });
        return true;
      } catch {
        return false;
      }
    },
    fix: 'Fix linting errors with: npm run lint:fix'
  },
  {
    name: 'All tests pass',
    check: () => {
      try {
        execSync('npm run test:ci', { stdio: 'pipe' });
        return true;
      } catch {
        return false;
      }
    },
    fix: 'Fix failing tests'
  },
  {
    name: 'Build succeeds',
    check: () => {
      try {
        execSync('npm run build', { stdio: 'pipe' });
        return fs.existsSync('dist') && fs.existsSync('dist/index.js');
      } catch {
        return false;
      }
    },
    fix: 'Fix build errors'
  }
];

let passed = 0;
let failed = 0;

console.log('Running verification checks...\n');

for (const check of checks) {
  process.stdout.write(`${check.name}... `);
  
  try {
    if (check.check()) {
      console.log('✅ PASS');
      passed++;
    } else {
      console.log('❌ FAIL');
      console.log(`   Fix: ${check.fix}\n`);
      failed++;
    }
  } catch (error) {
    console.log('❌ ERROR');
    console.log(`   Error: ${error.message}`);
    console.log(`   Fix: ${check.fix}\n`);
    failed++;
  }
}

console.log(`\n📊 Verification Results: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
  console.log('🎉 Production build verification PASSED!');
  console.log('✅ Ready for deployment to pre-production environment');
  console.log('\nNext steps:');
  console.log('1. Create git tag: git tag preprod-v1 && git push origin preprod-v1');
  console.log('2. Deploy to pre-production environment');
  console.log('3. Run integration tests');
  process.exit(0);
} else {
  console.log('⚠️  Production build verification FAILED');
  console.log('❌ Fix the issues above before deploying');
  process.exit(1);
}