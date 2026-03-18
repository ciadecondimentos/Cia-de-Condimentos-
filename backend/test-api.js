const http = require('http');

// Testar GET /api/products
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/products',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    const json = JSON.parse(data);
    console.log('Produtos:', json.Count);
    console.log('Primeiro produto:', json.value[0]);
  });
});

req.on('error', (e) => {
  console.error('Erro:', e);
});

req.end();
