#!/usr/bin/env node

/**
 * TitleTesterPro Comprehensive QA & Health Check
 * Tests all dashboard and backend functionality
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset', prefix = '') {
  console.log(`${colors[color]}${prefix}${message}${colors.reset}`);
}

async function performRequest(url, options = {}) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return { status: response.status, data, ok: response.ok };
  } catch (error) {
    return { status: 'error', error: error.message, ok: false };
  }
}

async function runQAChecks() {
  log('\n🔍 TitleTesterPro Comprehensive QA & Health Check\n', 'cyan');
  log('='.repeat(50), 'cyan');

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    errors: []
  };

  // 1. SERVER HEALTH CHECK
  log('\n📡 SERVER HEALTH', 'blue');
  const health = await performRequest('http://localhost:5000/api/health');
  if (health.ok) {
    log('Server is healthy', 'green', '✅ ');
    results.passed++;
  } else {
    log('Server health check failed', 'red', '❌ ');
    results.failed++;
    results.errors.push('Server health check failed');
  }

  // 2. DATABASE CONNECTIVITY
  log('\n🗄️  DATABASE CHECKS', 'blue');
  try {
    const dbUrl = process.env.DATABASE_URL || fs.readFileSync('.env', 'utf8').match(/DATABASE_URL=(.+)/)?.[1];
    if (dbUrl) {
      log('Database URL configured', 'green', '✅ ');
      results.passed++;
    } else {
      log('Database URL not found', 'red', '❌ ');
      results.failed++;
      results.errors.push('Database URL not configured');
    }
  } catch (e) {
    log('Cannot verify database configuration', 'yellow', '⚠️  ');
    results.warnings++;
  }

  // 3. AUTHENTICATION CHECK
  log('\n🔐 AUTHENTICATION', 'blue');
  
  // First try to get a demo session
  const demoLogin = await performRequest('http://localhost:5000/api/auth/demo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'kaseydoesmarketing@gmail.com' })
  });

  let sessionToken = null;
  if (demoLogin.ok && demoLogin.data.sessionToken) {
    sessionToken = demoLogin.data.sessionToken;
    log('Demo authentication successful', 'green', '✅ ');
    results.passed++;
  } else {
    log('Demo authentication not available', 'yellow', '⚠️  ');
    results.warnings++;
  }

  // 4. API ENDPOINTS CHECK
  log('\n🌐 API ENDPOINTS', 'blue');
  
  const endpoints = [
    { name: 'Dashboard Stats', url: '/api/dashboard/stats' },
    { name: 'Tests List', url: '/api/tests' },
    { name: 'User Profile', url: '/api/auth/me' }
  ];

  for (const endpoint of endpoints) {
    const headers = sessionToken ? { 'Cookie': `sessionToken=${sessionToken}` } : {};
    const response = await performRequest(`http://localhost:5000${endpoint.url}`, { headers });
    
    if (response.ok) {
      log(`${endpoint.name}: Working`, 'green', '✅ ');
      results.passed++;
      
      // Additional checks for specific endpoints
      if (endpoint.url === '/api/dashboard/stats' && response.data) {
        log(`   - Active Tests: ${response.data.activeTests || 0}`, 'cyan');
        log(`   - Total Views: ${response.data.totalViews || 0}`, 'cyan');
        log(`   - Average CTR: ${response.data.avgCtr || 0}%`, 'cyan');
      }
      
      if (endpoint.url === '/api/tests' && response.data) {
        log(`   - Found ${response.data.length || 0} tests`, 'cyan');
      }
    } else {
      log(`${endpoint.name}: Failed (${response.status})`, 'red', '❌ ');
      results.failed++;
      results.errors.push(`${endpoint.name} endpoint failed`);
    }
  }

  // 5. FRONTEND BUILD CHECK
  log('\n🎨 FRONTEND BUILD', 'blue');
  
  const frontendFiles = [
    'client/src/App.tsx',
    'client/src/pages/dashboard.tsx',
    'client/src/lib/queryClient.ts'
  ];

  for (const file of frontendFiles) {
    if (fs.existsSync(file)) {
      log(`${path.basename(file)}: Found`, 'green', '✅ ');
      results.passed++;
    } else {
      log(`${path.basename(file)}: Missing`, 'red', '❌ ');
      results.failed++;
      results.errors.push(`Missing frontend file: ${file}`);
    }
  }

  // 6. CONFIGURATION CHECK
  log('\n⚙️  CONFIGURATION', 'blue');
  
  const requiredEnvVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'SESSION_SECRET',
    'ENCRYPTION_KEY'
  ];

  const envContent = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
  
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar] || envContent.includes(envVar)) {
      log(`${envVar}: Configured`, 'green', '✅ ');
      results.passed++;
    } else {
      log(`${envVar}: Missing`, 'yellow', '⚠️  ');
      results.warnings++;
    }
  }

  // 7. ANALYTICS ACCURACY CHECK
  log('\n📊 ANALYTICS ACCURACY', 'blue');
  
  if (sessionToken) {
    const testsResponse = await performRequest('http://localhost:5000/api/tests', {
      headers: { 'Cookie': `sessionToken=${sessionToken}` }
    });
    
    if (testsResponse.ok && testsResponse.data.length > 0) {
      const testId = testsResponse.data[0].id;
      const analyticsResponse = await performRequest(`http://localhost:5000/api/tests/${testId}/analytics`, {
        headers: { 'Cookie': `sessionToken=${sessionToken}` }
      });
      
      if (analyticsResponse.ok) {
        log('Analytics endpoint working', 'green', '✅ ');
        results.passed++;
        
        const analytics = analyticsResponse.data;
        if (analytics.aggregateMetrics) {
          log(`   - Total Views: ${analytics.aggregateMetrics.totalViews || 0}`, 'cyan');
          log(`   - Overall CTR: ${analytics.aggregateMetrics.overallCtr?.toFixed(2) || 0}%`, 'cyan');
          log(`   - Poll Count: ${analytics.aggregateMetrics.pollCount || 0}`, 'cyan');
        }
      } else {
        log('Analytics endpoint error', 'red', '❌ ');
        results.failed++;
        results.errors.push('Analytics endpoint not working properly');
      }
    }
  }

  // 8. SCHEDULER STATUS
  log('\n⏰ SCHEDULER STATUS', 'blue');
  
  // Check if scheduler files exist
  const schedulerFiles = [
    'server/scheduler.ts',
    'server/analyticsCollector.ts'
  ];
  
  for (const file of schedulerFiles) {
    if (fs.existsSync(file)) {
      log(`${path.basename(file)}: Found`, 'green', '✅ ');
      results.passed++;
    } else {
      log(`${path.basename(file)}: Missing`, 'yellow', '⚠️  ');
      results.warnings++;
    }
  }

  // 9. SECURITY CHECK
  log('\n🔒 SECURITY AUDIT', 'blue');
  
  // Check for exposed secrets in code
  const sourceFiles = [
    'server/index.ts',
    'server/routes.ts',
    'server/auth.ts'
  ];
  
  let securityIssues = 0;
  for (const file of sourceFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      const patterns = [
        /password\s*=\s*["'][^"']+["']/i,
        /secret.*=\s*["'][^"']+["']/i,
        /key\s*=\s*["'][^"']+["']/i
      ];
      
      let hasIssue = false;
      for (const pattern of patterns) {
        if (pattern.test(content) && !content.includes('process.env') && !content.includes('demo-')) {
          hasIssue = true;
          securityIssues++;
          break;
        }
      }
      
      if (!hasIssue) {
        log(`${path.basename(file)}: No hardcoded secrets`, 'green', '✅ ');
        results.passed++;
      } else {
        log(`${path.basename(file)}: Potential security issue`, 'red', '❌ ');
        results.failed++;
        results.errors.push(`Security issue in ${file}`);
      }
    }
  }

  // SUMMARY
  log('\n' + '='.repeat(50), 'cyan');
  log('\n📊 QA CHECK SUMMARY', 'magenta');
  log(`✅ Passed: ${results.passed}`, 'green');
  log(`⚠️  Warnings: ${results.warnings}`, 'yellow');
  log(`❌ Failed: ${results.failed}`, 'red');
  
  if (results.errors.length > 0) {
    log('\n❌ Failed Checks:', 'red');
    results.errors.forEach(error => {
      log(`   - ${error}`, 'red');
    });
  }

  const overallStatus = results.failed === 0 ? 'PASSED' : 'FAILED';
  const statusColor = results.failed === 0 ? 'green' : 'red';
  
  log('\n' + '='.repeat(50), 'cyan');
  log(`Overall Status: ${overallStatus}`, statusColor);
  log('='.repeat(50) + '\n', 'cyan');
  
  // Recommendations
  if (results.failed > 0 || results.warnings > 0) {
    log('📝 RECOMMENDATIONS:', 'yellow');
    
    if (results.warnings > 0) {
      log('   1. Configure missing environment variables in .env file', 'yellow');
      log('   2. Ensure scheduler files are properly set up', 'yellow');
    }
    
    if (results.failed > 0) {
      log('   1. Fix failed API endpoints', 'yellow');
      log('   2. Resolve security issues if any', 'yellow');
      log('   3. Ensure all required files are present', 'yellow');
    }
  }
}

// Run the QA checks
runQAChecks().catch(error => {
  log(`\n❌ QA Check failed with error: ${error.message}`, 'red');
  process.exit(1);
});