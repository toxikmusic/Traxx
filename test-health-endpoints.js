import fetch from 'node-fetch';

// Get the domain from environment or default to localhost
const domain = process.env.REPLIT_DOMAINS ? process.env.REPLIT_DOMAINS.split(',')[0] : 'localhost:3000';
const protocol = domain.includes('localhost') ? 'http' : 'https';
const baseUrl = `${protocol}://${domain}`;

console.log(`\n🔍 Testing Traxx health endpoints on ${baseUrl} ...\n`);

// Test the basic health check endpoint
async function testBasicHealthCheck() {
  console.log('1️⃣ Testing basic health check endpoint (/api/health-check)...');
  
  try {
    const response = await fetch(`${baseUrl}/api/health-check`);
    const data = await response.json();
    
    console.log(`  Status: ${response.status} ${response.statusText}`);
    console.log('  Response:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.status === 'ok') {
      console.log('  ✅ Basic health check passed!');
      return true;
    } else {
      console.log('  ❌ Basic health check failed!');
      return false;
    }
  } catch (error) {
    console.error(`  ❌ Error testing basic health check: ${error.message}`);
    return false;
  }
}

// Test the standard health endpoint
async function testStandardHealth() {
  console.log('\n2️⃣ Testing standard health endpoint (/api/health)...');
  
  try {
    const response = await fetch(`${baseUrl}/api/health`);
    const data = await response.json();
    
    console.log(`  Status: ${response.status} ${response.statusText}`);
    console.log('  Response:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.status === 'ok') {
      console.log('  ✅ Standard health check passed!');
      return true;
    } else {
      console.log('  ❌ Standard health check failed!');
      return false;
    }
  } catch (error) {
    console.error(`  ❌ Error testing standard health: ${error.message}`);
    return false;
  }
}

// Test the detailed health endpoint
async function testDetailedHealth() {
  console.log('\n3️⃣ Testing detailed health endpoint (/api/health/detailed)...');
  
  try {
    const response = await fetch(`${baseUrl}/api/health/detailed`);
    const data = await response.json();
    
    console.log(`  Status: ${response.status} ${response.statusText}`);
    console.log('  Response:', JSON.stringify(data, null, 2));
    
    if (response.ok && (data.status === 'healthy' || data.status === 'degraded')) {
      console.log('  ✅ Detailed health check passed!');
      return true;
    } else {
      console.log('  ❌ Detailed health check failed!');
      return false;
    }
  } catch (error) {
    console.error(`  ❌ Error testing detailed health: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log(`\n🔍 Starting health endpoint tests at ${new Date().toISOString()}`);
  
  const results = [
    await testBasicHealthCheck(),
    await testStandardHealth(),
    await testDetailedHealth()
  ];
  
  const passedCount = results.filter(result => result).length;
  const totalCount = results.length;
  
  console.log(`\n📊 Test Summary: ${passedCount}/${totalCount} health endpoints are working`);
  
  if (passedCount === totalCount) {
    console.log('🎉 All health endpoints are working properly!\n');
    process.exit(0);
  } else if (passedCount > 0) {
    console.log('⚠️ Some health endpoints are not working properly.\n');
    process.exit(1);
  } else {
    console.log('❌ None of the health endpoints are working properly.\n');
    process.exit(2);
  }
}

// Execute the tests
runTests();