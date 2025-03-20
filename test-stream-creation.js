import fetch from 'node-fetch';

async function testStreamCreation() {
  try {
    console.log('Starting stream creation test...');
    
    // First, we need to log in to get authentication
    console.log('Attempting to log in...');
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'toxik',
        password: 'password123'
      }),
      redirect: 'manual'
    });
    
    // Get the cookies from the response
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Login response status:', loginResponse.status);
    
    // Create a test stream
    console.log('Attempting to create a stream...');
    const streamResponse = await fetch('http://localhost:5000/api/streams', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        title: 'Test Stream',
        description: 'Testing the stream key functionality'
      })
    });
    
    const streamData = await streamResponse.json();
    console.log('Stream creation response status:', streamResponse.status);
    console.log('Stream creation response:', JSON.stringify(streamData, null, 2));
    
    // If we got a stream key, test that we can regenerate it
    if (streamData.id && streamData.streamKey) {
      console.log('Testing stream key regeneration...');
      const regenerateResponse = await fetch(`http://localhost:5000/api/streams/${streamData.id}/regenerate-key`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': cookies
        }
      });
      
      const regenerateData = await regenerateResponse.json();
      console.log('Key regeneration response status:', regenerateResponse.status);
      console.log('Key regeneration response:', JSON.stringify(regenerateData, null, 2));
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testStreamCreation();