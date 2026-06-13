const proxyquire = require('proxyquire');
const express = require('express');

let stripeListCount = 0;

const stripeMock = (key) => ({
  products: {
    list: async () => {
      stripeListCount++;
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 50));
      return {
        data: [
          { id: 'prod_1', metadata: { product_id: 'fr_hike' } },
          { id: 'prod_2', metadata: { product_id: 'gb_hike' } },
          { id: 'prod_3', metadata: { product_id: 'painters_way' } }
        ]
      };
    }
  }
});

const appMock = express();
// Prevent server from listening
appMock.listen = () => {};

const expressMock = function() { return appMock; };
expressMock.static = () => (req, res, next) => next();
expressMock.json = () => (req, res, next) => next();

const server = proxyquire('./server.js', {
  'stripe': stripeMock,
  'express': expressMock
});

const getProductsRoute = appMock._router.stack.find(
  layer => layer.route && layer.route.path === '/products'
).route.stack[0].handle;

async function runBenchmark() {
  console.log("Starting benchmark...");
  stripeListCount = 0;

  const req = {};
  const res = {
    json: (data) => data,
    status: (code) => ({ json: (data) => data })
  };

  const start = Date.now();
  for (let i = 0; i < 5; i++) {
    await getProductsRoute(req, res);
  }
  const end = Date.now();

  console.log(`Total time for 5 requests: ${end - start} ms`);
  console.log(`Stripe products.list calls: ${stripeListCount}`);
  process.exit(0);
}

runBenchmark();
