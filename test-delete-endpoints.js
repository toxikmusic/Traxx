import fetch from 'node-fetch';
const baseUrl = 'http://localhost:5000';

// Should be a valid session cookie from an authenticated user session
// For testing only - in real usage users would authenticate through the UI
const cookieHeader = ''; // This would be populated from browser session

async function testDeleteTrack() {
  console.log('Testing DELETE track endpoint...');
  
  // First, try to delete without authentication (should fail)
  try {
    const response = await fetch(`${baseUrl}/api/tracks/1`, {
      method: 'DELETE',
    });
    
    console.log(`Status without auth: ${response.status}`);
    console.log(`Response: ${await response.text()}`);
    
    if (response.status !== 401) {
      console.error('❌ ERROR: Unauthenticated delete request should return 401');
    } else {
      console.log('✅ Correct response for unauthenticated request');
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
  
  // If you want to test with authentication, you'd need a valid session cookie
  // We're omitting this test since it would require manual authentication setup
  if (cookieHeader) {
    try {
      const response = await fetch(`${baseUrl}/api/tracks/1`, {
        method: 'DELETE',
        headers: {
          'Cookie': cookieHeader
        }
      });
      
      console.log(`Status with auth: ${response.status}`);
      const data = await response.json();
      console.log(`Response: ${JSON.stringify(data)}`);
      
      if (response.ok) {
        console.log('✅ Successfully deleted track');
      } else {
        console.error(`❌ Failed to delete track: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Authenticated request failed:', error);
    }
  }
}

async function testDeleteStream() {
  console.log('\nTesting DELETE stream endpoint...');
  
  // First, try to delete without authentication (should fail)
  try {
    const response = await fetch(`${baseUrl}/api/streams/1`, {
      method: 'DELETE',
    });
    
    console.log(`Status without auth: ${response.status}`);
    console.log(`Response: ${await response.text()}`);
    
    if (response.status !== 401) {
      console.error('❌ ERROR: Unauthenticated delete request should return 401');
    } else {
      console.log('✅ Correct response for unauthenticated request');
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
  
  // If you want to test with authentication, you'd need a valid session cookie
  // We're omitting this test since it would require manual authentication setup
  if (cookieHeader) {
    try {
      const response = await fetch(`${baseUrl}/api/streams/1`, {
        method: 'DELETE',
        headers: {
          'Cookie': cookieHeader
        }
      });
      
      console.log(`Status with auth: ${response.status}`);
      const data = await response.json();
      console.log(`Response: ${JSON.stringify(data)}`);
      
      if (response.ok) {
        console.log('✅ Successfully deleted stream');
      } else {
        console.error(`❌ Failed to delete stream: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Authenticated request failed:', error);
    }
  }
}

async function runTests() {
  await testDeleteTrack();
  await testDeleteStream();
}

runTests().catch(console.error);