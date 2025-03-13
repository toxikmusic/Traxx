/**
 * BeatStream Production Readiness Check Tool
 * 
 * This script verifies that the application is ready for production deployment
 * by checking various aspects of the codebase and configuration.
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Constants
const MIN_NODE_VERSION = 18;
const REQUIRED_ENV_VARS = [
  'SESSION_SECRET',
  'CLOUDFLARE_API_KEY',
];

// Tracking
let errorCount = 0;
let warningCount = 0;

/**
 * Main check function that runs all production checks
 */
async function runProductionChecks() {
  console.log('🔍 Running production readiness checks...\n');

  // System Checks
  await checkNodeVersion();
  
  // Environment Checks
  checkEnvironmentVariables();
  
  // Security Checks
  checkSessionSecret();
  checkAuthImplementation();
  
  // Performance Checks
  await checkBundleSize();
  
  // Configuration Checks
  checkCloudflareConfiguration();
  
  // Final Report
  console.log('\n📋 Production Readiness Report:');
  console.log(`   ${errorCount} critical issues found`);
  console.log(`   ${warningCount} warnings found`);
  
  return errorCount === 0;
}

/**
 * Check if Node.js version is sufficient
 */
async function checkNodeVersion() {
  try {
    const { stdout } = await execAsync('node --version');
    const version = parseInt(stdout.match(/v(\d+)\./)?.[1] || '0', 10);
    
    if (version < MIN_NODE_VERSION) {
      logError(`Node.js version ${version} is below minimum required version ${MIN_NODE_VERSION}`);
    } else {
      logSuccess(`Node.js version ${version} meets minimum requirement (v${MIN_NODE_VERSION})`);
    }
  } catch (error) {
    logError('Failed to check Node.js version');
  }
}

/**
 * Check if required environment variables are set
 */
function checkEnvironmentVariables() {
  console.log('🔑 Checking environment variables...');
  
  const missingVars = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);
  
  if (missingVars.length === 0) {
    logSuccess('All required environment variables are set');
  } else {
    missingVars.forEach(varName => {
      logError(`Required environment variable ${varName} is not set`);
    });
  }
}

/**
 * Check if the session secret is properly configured
 */
function checkSessionSecret() {
  const sessionSecret = process.env.SESSION_SECRET;
  
  if (!sessionSecret) {
    // Already reported in environment variables check
    return;
  }
  
  if (sessionSecret === 'development_secret' || sessionSecret.length < 32) {
    logError('Session secret appears to be a development default or too short');
  } else {
    logSuccess('Session secret is properly configured');
  }
}

/**
 * Check if proper authentication is implemented
 */
function checkAuthImplementation() {
  try {
    // Check if auth.ts exists
    if (!fs.existsSync(path.join(process.cwd(), 'server', 'auth.ts'))) {
      logError('Authentication module (server/auth.ts) not found');
      return;
    }
    
    logSuccess('Authentication module found');
  } catch (error) {
    logError('Failed to check authentication implementation');
  }
}

/**
 * Check if the bundle size is reasonable
 */
async function checkBundleSize() {
  try {
    // This would normally build the application and check the bundle size
    // For this example, we'll just do a basic check
    logWarning('Bundle size check not implemented - remember to check bundle size before production');
  } catch (error) {
    logError('Failed to check bundle size');
  }
}

/**
 * Check if Cloudflare is properly configured
 */
function checkCloudflareConfiguration() {
  const cloudflareApiKey = process.env.CLOUDFLARE_API_KEY;
  
  if (!cloudflareApiKey) {
    // Already reported in environment variables check
    return;
  }
  
  // Additional validation could be done here
  logSuccess('Cloudflare API key is configured');
}

// Helper functions

function logSuccess(message: string) {
  console.log(`   ✅ ${message}`);
}

function logWarning(message: string) {
  warningCount++;
  console.log(`   ⚠️ ${message}`);
}

function logError(message: string) {
  errorCount++;
  console.log(`   ❌ ${message}`);
}

// Run the checks when this script is executed directly
runProductionChecks()
  .then(isReady => {
    if (!isReady) {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('An unexpected error occurred during checks:', error);
    process.exit(1);
  });