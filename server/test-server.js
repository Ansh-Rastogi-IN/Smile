const express = require('express');
const app = express();

app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

const PORT = 3001;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running on http://localhost:${PORT}`);
});

// Keep alive
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close();
  process.exit(0);
});

// Error handling
server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

console.log('Server started, waiting for connections...');
