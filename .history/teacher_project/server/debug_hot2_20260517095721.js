const axios = require('axios');
const http = require('http');

// Quick test via the running server
http.get('http://localhost:5000/api/renmin?page=1&pageSize=50', r => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', () => {
    const j = JSON.parse(d);
    console.log('Total:', j.total);
    j.data.forEach((a, i) => {
      console.log((i + 1) + '.', a.title.substring(0, 50), '| video:', a.hasVideo ? 'Y' : 'N');
    });
  });
});
