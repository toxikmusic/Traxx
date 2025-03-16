const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');

const app = express();
const port = process.env.PORT || 3000;

// Serve the status check file
app.get('/', (req, res) => {
  const statusHtml = fs.readFileSync(path.join(__dirname, 'status-check.html'), 'utf-8');
  res.send(statusHtml);
});

// Forward API requests to the main server
app.use('/api', (req, res) => {
  // Forward to the main application server
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: 'localhost:5000'
    }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (error) => {
    console.error('Proxy error:', error);
    res.status(500).send('Error connecting to main server: ' + error.message);
  });

  if (req.body) {
    proxyReq.write(JSON.stringify(req.body));
  }
  
  proxyReq.end();
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Diagnostic server running on port ${port}`);
  console.log(`Access it at: http://localhost:${port}`);
});