// app.js

const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Middleware
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

// Define a simple route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
