const express = require('express');
const session = require('express-session');
const axios = require('axios');
const app = express();

// Create a simple test endpoint that calls our API
app.get('/test-stream-creation', async (req, res) => {
  try {
    console.log('Starting API test...');
    
    // Step 1: Login to get a session
    console.log('Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'toxik',
      password: 'password123'
    }, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Login response:', loginResponse.status);
    const cookies = loginResponse.headers['set-cookie'];
    
    // Step 2: Create a stream
    console.log('Creating stream...');
    const streamResponse = await axios.post('http://localhost:5000/api/streams', {
      title: 'Test Stream',
      description: 'Testing stream key functionality'
    }, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    });
    
    console.log('Stream creation response:', streamResponse.status);
    console.log('Stream data:', JSON.stringify(streamResponse.data, null, 2));
    
    res.json({
      success: true,
      loginStatus: loginResponse.status,
      streamStatus: streamResponse.status,
      streamData: streamResponse.data
    });
  } catch (error) {
    console.error('Test failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      response: error.response ? {
        status: error.response.status,
        data: error.response.data
      } : null
    });
  }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT}/test-stream-creation to run the test`);
});