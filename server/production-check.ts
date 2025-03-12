/**
 * BeatStream Production Readiness Check
 * This script checks if the application is ready for production deployment
 */

import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables from .env.production
dotenv.config({ path: '.env.production' });

// Required environment variables for production
const requiredEnvVars = [
  'NODE_ENV',
  'SESSION_SECRET',
  'CLOUDFLARE_API_KEY'
];

// Optional but recommended environment variables
const recommendedEnvVars = [
  'CORS_ORIGIN',
  'RATE_LIMIT_MAX',
  'RATE_LIMIT_WINDOW_MS'
];

// Critical security checks
const securityChecks = [
  {
    name: 'Session Secret Length',
    check: () => {
      const secret = process.env.SESSION_SECRET;
      return {
        pass: secret && secret.length >= 32,
        message: 'SESSION_SECRET should be at least 32 characters long'
      };
    }
  },
  {
    name: 'Production Mode',
    check: () => {
      return {
        pass: process.env.NODE_ENV === 'production',
        message: 'NODE_ENV should be set to "production"'
      };
    }
  },
  {
    name: 'HTTPS in Production',
    check: () => {
      return {
        pass: process.env.NODE_ENV !== 'production' || process.env.SECURE_COOKIES === 'true',
        message: 'SECURE_COOKIES should be "true" in production'
      };
    }
  },
  {
    name: 'Rate Limiting',
    check: () => {
      return {
        pass: process.env.RATE_LIMIT_MAX !== undefined && process.env.RATE_LIMIT_WINDOW_MS !== undefined,
        message: 'Rate limiting should be configured for production'
      };
    }
  }
];

// Performance checks
const performanceChecks = [
  {
    name: 'Client-side Build',
    check: () => {
      const buildPath = path.join(__dirname, '..', 'client', 'dist');
      return {
        pass: fs.existsSync(buildPath),
        message: 'Client-side build not found. Run npm run build before deploying'
      };
    }
  }
];

async function runProductionChecks() {
  console.log(chalk.blue.bold('🚀 BeatStream Production Readiness Check'));
  console.log(chalk.blue('==========================================='));
  
  let allChecksPassed = true;
  let criticalChecksFailed = false;
  let warningsFound = false;
  
  // Check environment variables
  console.log(chalk.yellow.bold('\n📋 Checking Required Environment Variables:'));
  for (const envVar of requiredEnvVars) {
    const exists = process.env[envVar] !== undefined;
    if (!exists) {
      allChecksPassed = false;
      criticalChecksFailed = true;
      console.log(chalk.red(`❌ ${envVar} is missing`));
    } else {
      console.log(chalk.green(`✅ ${envVar} is set`));
    }
  }
  
  console.log(chalk.yellow.bold('\n📋 Checking Recommended Environment Variables:'));
  for (const envVar of recommendedEnvVars) {
    const exists = process.env[envVar] !== undefined;
    if (!exists) {
      warningsFound = true;
      console.log(chalk.yellow(`⚠️ ${envVar} is not set (recommended)`));
    } else {
      console.log(chalk.green(`✅ ${envVar} is set`));
    }
  }
  
  // Run security checks
  console.log(chalk.yellow.bold('\n🔒 Running Security Checks:'));
  for (const check of securityChecks) {
    const result = check.check();
    if (!result.pass) {
      allChecksPassed = false;
      criticalChecksFailed = true;
      console.log(chalk.red(`❌ ${check.name}: ${result.message}`));
    } else {
      console.log(chalk.green(`✅ ${check.name} passed`));
    }
  }
  
  // Run performance checks
  console.log(chalk.yellow.bold('\n⚡ Running Performance Checks:'));
  for (const check of performanceChecks) {
    const result = check.check();
    if (!result.pass) {
      warningsFound = true;
      console.log(chalk.yellow(`⚠️ ${check.name}: ${result.message}`));
    } else {
      console.log(chalk.green(`✅ ${check.name} passed`));
    }
  }
  
  // Check Cloudflare API key if set
  console.log(chalk.yellow.bold('\n☁️ Checking External Services:'));
  if (process.env.CLOUDFLARE_API_KEY) {
    try {
      console.log(chalk.blue('Testing Cloudflare API connectivity...'));
      const response = await axios({
        method: 'GET',
        url: 'https://api.cloudflare.com/client/v4/user/tokens/verify',
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      if (response.data && response.data.success) {
        console.log(chalk.green('✅ Cloudflare API key is valid'));
      } else {
        console.log(chalk.red('❌ Cloudflare API key verification failed'));
        allChecksPassed = false;
      }
    } catch (error: any) { // Using any temporarily to resolve the type issue
      const errorMessage = error?.message || String(error);
      console.log(chalk.red(`❌ Cloudflare API connection failed: ${errorMessage}`));
      allChecksPassed = false;
    }
  } else {
    console.log(chalk.yellow('⚠️ Cloudflare API key not set, skipping test'));
  }
  
  // Final summary
  console.log(chalk.blue('\n==========================================='));
  if (criticalChecksFailed) {
    console.log(chalk.red.bold('❌ CRITICAL CHECKS FAILED: Your application is NOT ready for production deployment!'));
    console.log(chalk.red('Please fix the critical issues listed above before deploying.'));
  } else if (warningsFound) {
    console.log(chalk.yellow.bold('⚠️ WARNINGS FOUND: Your application can be deployed, but has some recommended improvements.'));
    console.log(chalk.yellow('Consider addressing the warnings before deploying for optimal performance and security.'));
  } else {
    console.log(chalk.green.bold('✅ ALL CHECKS PASSED: Your application is ready for production deployment!'));
  }
}

// Only run directly if not imported
if (require.main === module) {
  runProductionChecks().catch(err => {
    console.error(chalk.red('Error running production checks:'), err);
    process.exit(1);
  });
}

export default runProductionChecks;