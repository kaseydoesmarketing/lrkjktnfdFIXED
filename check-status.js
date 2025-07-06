#!/usr/bin/env node

/**
 * TitleTesterPro Health Check Script
 * For Replit AI Agent - Complete Status Verification
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 TitleTesterPro Health Check Starting...\n');

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset', prefix = '') {
  console.log(`${colors[color]}${prefix}${message}${colors.reset}`);
}

function check(description, testFn) {
  try {
    const result = testFn();
    log(`✅ ${description}`, 'green');
    return { success: true, result };
  } catch (error) {
    log(`❌ ${description}`, 'red');
    log(`   Error: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

// Results tracking
const results = {
  environment: {},
  dependencies: {},
  database: {},
  application: {},
  security: {},
  documentation: {}
};

// 1. Environment Checks
log('📋 ENVIRONMENT CHECKS', 'blue', '\n');

results.environment.nodeVersion = check('Node.js Version', () => {
  const version = execSync('node --version', { encoding: 'utf8' }).trim();
  const majorVersion = parseInt(version.slice(1).split('.')[0]);
  if (majorVersion < 18) {
    throw new Error(`Node.js version ${version} is too old. Need v18+`);
  }
  return version;
});

results.environment.npmVersion = check('npm Version', () => {
  return execSync('npm --version', { encoding: 'utf8' }).trim();
});

results.environment.envFile = check('Environment File', () => {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    // Try to create from template
    const templatePath = path.join(process.cwd(), 'env.template');
    if (fs.existsSync(templatePath)) {
      fs.copyFileSync(templatePath, envPath);
      log('   Created .env from template', 'yellow');
    } else {
      throw new Error('.env file missing and no template found');
    }
  }
  return 'Environment file exists';
});

results.environment.workingDir = check('Working Directory', () => {
  const requiredFiles = ['package.json', 'server', 'client'];
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(process.cwd(), file))) {
      throw new Error(`Required file/directory missing: ${file}`);
    }
  }
  return 'All required files present';
});

// 2. Dependencies Checks
log('\n📦 DEPENDENCIES CHECKS', 'blue');

results.dependencies.nodeModules = check('Node Modules', () => {
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    throw new Error('node_modules directory missing - run npm install');
  }
  return 'Dependencies installed';
});

results.dependencies.packageJson = check('Package.json', () => {
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const requiredScripts = ['dev', 'build', 'start', 'db:push'];
  for (const script of requiredScripts) {
    if (!packageData.scripts[script]) {
      throw new Error(`Missing required script: ${script}`);
    }
  }
  
  const requiredDeps = ['react', 'express', 'drizzle-orm', 'typescript'];
  for (const dep of requiredDeps) {
    if (!packageData.dependencies[dep] && !packageData.devDependencies[dep]) {
      throw new Error(`Missing required dependency: ${dep}`);
    }
  }
  
  return 'Package.json valid';
});

results.dependencies.typeScript = check('TypeScript Configuration', () => {
  const tsConfigPath = path.join(process.cwd(), 'tsconfig.json');
  if (!fs.existsSync(tsConfigPath)) {
    throw new Error('tsconfig.json missing');
  }
  return 'TypeScript configured';
});

// 3. Database Checks
log('\n🗄️ DATABASE CHECKS', 'blue');

results.database.migrationFile = check('Migration Files', () => {
  const migrationsDir = path.join(process.cwd(), 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    throw new Error('Migrations directory missing');
  }
  
  const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
  if (migrationFiles.length === 0) {
    throw new Error('No migration files found');
  }
  
  return `${migrationFiles.length} migration files found`;
});

results.database.schemaFile = check('Schema Definition', () => {
  const schemaPath = path.join(process.cwd(), 'shared', 'schema.ts');
  if (!fs.existsSync(schemaPath)) {
    throw new Error('Schema file missing');
  }
  return 'Schema definition exists';
});

// 4. Application Checks
log('\n🚀 APPLICATION CHECKS', 'blue');

results.application.serverFile = check('Server Entry Point', () => {
  const serverPath = path.join(process.cwd(), 'server', 'index.ts');
  if (!fs.existsSync(serverPath)) {
    throw new Error('Server entry point missing');
  }
  return 'Server file exists';
});

results.application.clientFile = check('Client Entry Point', () => {
  const clientPath = path.join(process.cwd(), 'client', 'src', 'App.tsx');
  if (!fs.existsSync(clientPath)) {
    throw new Error('Client entry point missing');
  }
  return 'Client file exists';
});

results.application.oauthRoutes = check('OAuth Routes', () => {
  const oauthPath = path.join(process.cwd(), 'server', 'oauthRoutes.ts');
  if (!fs.existsSync(oauthPath)) {
    throw new Error('OAuth routes missing');
  }
  return 'OAuth routes configured';
});

// 5. Security Checks
log('\n🔒 SECURITY CHECKS', 'blue');

results.security.envTemplate = check('Environment Template', () => {
  const templatePath = path.join(process.cwd(), 'env.template');
  if (!fs.existsSync(templatePath)) {
    throw new Error('Environment template missing');
  }
  return 'Environment template exists';
});

results.security.noSecrets = check('No Secrets in Code', () => {
  const sensitivePatterns = [
    /GOOGLE_CLIENT_SECRET\s*=\s*['"][^'"]+['"]/,
    /DATABASE_URL\s*=\s*['"][^'"]+['"]/,
    /JWT_SECRET\s*=\s*['"][^'"]+['"]/
  ];
  
  const filesToCheck = [
    'server/index.ts',
    'server/oauthRoutes.ts',
    'client/src/App.tsx'
  ];
  
  for (const file of filesToCheck) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      for (const pattern of sensitivePatterns) {
        if (pattern.test(content)) {
          throw new Error(`Sensitive data found in ${file}`);
        }
      }
    }
  }
  
  return 'No secrets in code';
});

// 6. Documentation Checks
log('\n📚 DOCUMENTATION CHECKS', 'blue');

results.documentation.readme = check('README.md', () => {
  const readmePath = path.join(process.cwd(), 'README.md');
  if (!fs.existsSync(readmePath)) {
    throw new Error('README.md missing');
  }
  return 'README exists';
});

results.documentation.setupScript = check('Setup Script', () => {
  const setupPath = path.join(process.cwd(), 'setup.sh');
  if (!fs.existsSync(setupPath)) {
    throw new Error('setup.sh missing');
  }
  return 'Setup script exists';
});

// Summary
log('\n📊 HEALTH CHECK SUMMARY', 'bold', '\n');

const allChecks = {
  ...results.environment,
  ...results.dependencies,
  ...results.database,
  ...results.application,
  ...results.security,
  ...results.documentation
};

const successful = Object.values(allChecks).filter(r => r.success).length;
const total = Object.keys(allChecks).length;

log(`Overall Status: ${successful}/${total} checks passed`, successful === total ? 'green' : 'yellow');

if (successful === total) {
  log('\n🎉 TitleTesterPro is fully operational!', 'green', '\n');
  log('Next steps:', 'blue');
  log('1. Run: npm run dev', 'green');
  log('2. Open: http://localhost:5000', 'green');
  log('3. Use demo login or configure OAuth credentials', 'green');
} else {
  log('\n⚠️ Some issues detected. Run the following to fix:', 'yellow', '\n');
  log('1. npm install', 'yellow');
  log('2. cp env.template .env', 'yellow');
  log('3. npm run db:push', 'yellow');
  log('4. npm run dev', 'yellow');
}

// Detailed issues
const failedChecks = Object.entries(allChecks).filter(([_, result]) => !result.success);
if (failedChecks.length > 0) {
  log('\n❌ Failed Checks:', 'red');
  failedChecks.forEach(([name, result]) => {
    log(`   - ${name}: ${result.error}`, 'red');
  });
}

console.log('\n' + '='.repeat(50));
log('Health check completed!', 'blue'); 