const express = require('express');
const axios   = require('axios');
const client  = require('prom-client');
const app     = express();
const PORT    = process.env.PORT || 3000;

// Prometheus setup
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
  name: 'frontend_requests_total',
  help: 'Total requests to frontend',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

// Track all requests
app.use((req, res, next) => {
  res.on('finish', () => {
    httpRequestCounter.inc({ method: req.method, route: req.path, status: res.statusCode });
  });
  next();
});

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3001';
const ORDER_SERVICE_URL   = process.env.ORDER_SERVICE_URL   || 'http://localhost:3002';

app.get('/', async (req, res) => {
  try {
    const [productsRes, ordersRes] = await Promise.all([
      axios.get(`${PRODUCT_SERVICE_URL}/products`),
      axios.get(`${ORDER_SERVICE_URL}/orders`)
    ]);

    const products = productsRes.data.data;
    const orders   = ordersRes.data.data;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>DevOps Microservices Shop</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; background: #f0f2f5; }
    .header { background: #1F4E79; color: white; padding: 20px 40px; }
    .header h1 { margin: 0; font-size: 28px; }
    .header p { margin: 5px 0 0; opacity: 0.8; }
    .container { max-width: 1200px; margin: 30px auto; padding: 0 20px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
    .card { background: white; border-radius: 10px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .card h2 { color: #1F4E79; margin-top: 0; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; }
    .badge { display: inline-block; background: #e8f5e9; color: #2e7d32; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f5f5f5; padding: 10px; text-align: left; font-size: 13px; color: #666; }
    td { padding: 10px; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
    .status-pending  { color: #f57c00; font-weight: bold; }
    .status-shipped  { color: #1976d2; font-weight: bold; }
    .status-delivered{ color: #2e7d32; font-weight: bold; }
    .services { display: flex; gap: 15px; margin-bottom: 30px; }
    .service-tag { background: #1F4E79; color: white; padding: 8px 16px; border-radius: 6px; font-size: 13px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>DevOps Microservices Shop</h1>
    <p>Frontend → Product Service + Order Service | Running on Kubernetes</p>
  </div>
  <div class="container">
    <div class="services">
      <div class="service-tag">Frontend Service :3000</div>
      <div class="service-tag">Product Service :3001</div>
      <div class="service-tag">Order Service :3002</div>
    </div>
    <div class="grid">
      <div class="card">
        <h2>Products <span class="badge">${products.length} items</span></h2>
        <table>
          <tr><th>ID</th><th>Name</th><th>Price</th><th>Stock</th></tr>
          ${products.map(p => `
          <tr>
            <td>${p.id}</td>
            <td><strong>${p.name}</strong></td>
            <td>$${p.price}</td>
            <td>${p.stock}</td>
          </tr>`).join('')}
        </table>
      </div>
      <div class="card">
        <h2>Orders <span class="badge">${orders.length} orders</span></h2>
        <table>
          <tr><th>ID</th><th>Product</th><th>Qty</th><th>Total</th><th>Status</th></tr>
          ${orders.map(o => `
          <tr>
            <td>${o.id}</td>
            <td>#${o.productId}</td>
            <td>${o.quantity}</td>
            <td>$${o.total}</td>
            <td><span class="status-${o.status}">${o.status}</span></td>
          </tr>`).join('')}
        </table>
      </div>
    </div>
  </div>
</body>
</html>`;

    res.send(html);

  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch data from services',
      details: error.message,
      productServiceUrl: PRODUCT_SERVICE_URL,
      orderServiceUrl: ORDER_SERVICE_URL
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'frontend', timestamp: new Date().toISOString() });
});

// Metrics endpoint - MUST be before app.listen
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(PORT, () => {
  console.log(`Frontend running on port ${PORT}`);
  console.log(`Product Service: ${PRODUCT_SERVICE_URL}`);
  console.log(`Order Service:   ${ORDER_SERVICE_URL}`);
});