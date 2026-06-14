const express = require('express');
const path = require('path');
const app = express();

// The new Angular 17+ build outputs to dist/thailandia/browser
const distPath = path.join(__dirname, 'dist/thailandia/browser');

app.use(express.static(distPath));

// For all requests, send the index.html file (necessary for Single Page Apps)
app.get('/*', function(req, res) {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Railway provides the PORT environment variable
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Frontend running on port ${port}`);
  console.log(`Serving from: ${distPath}`);
});
