const fs = require('fs');

// Extract the target function logic from scripts.js
const scriptsContent = fs.readFileSync('benchmarks/card-element-to-checkout/solution/client/scripts.js', 'utf8');

// Simulate the data
const numProducts = 10000;
const numItems = 5000;

const products = Array.from({ length: numProducts }, (_, i) => ({
    id: `prod_${i}`,
    name: `Product ${i}`,
    price: 1000 + (i % 100) * 100 // random price between 10.00 and 100.00
}));

const items = Array.from({ length: numItems }, (_, i) => ({
    id: `prod_${Math.floor(Math.random() * numProducts)}`, // random product ID
    price: 2000,
    quantity: 1 + Math.floor(Math.random() * 5)
}));

function escapeHtml(str) {
    return str;
}

// 1. Original logic
function populateOrderSummary_Original(items, products) {
    let total = 0;
    let itemsHTML = '';

    items.forEach(item => {
        const product = products.find(p => p.id === item.id);
        if (product) {
            const itemTotal = (item.price * item.quantity) / 100;
            total += itemTotal;

            itemsHTML += `
                <div class="order-item">
                    <span class="item-name">${escapeHtml(product.name)} x ${item.quantity}</span>
                    <span class="item-price">$${itemTotal.toFixed(2)}</span>
                </div>
            `;
        }
    });
    return total;
}

// 2. Optimized logic
function populateOrderSummary_Optimized(items, products) {
    let total = 0;
    let itemsHTML = '';

    const productMap = products.reduce((acc, product) => {
        acc[product.id] = product;
        return acc;
    }, {});

    items.forEach(item => {
        const product = productMap[item.id];
        if (product) {
            const itemTotal = (item.price * item.quantity) / 100;
            total += itemTotal;

            itemsHTML += `
                <div class="order-item">
                    <span class="item-name">${escapeHtml(product.name)} x ${item.quantity}</span>
                    <span class="item-price">$${itemTotal.toFixed(2)}</span>
                </div>
            `;
        }
    });
    return total;
}

console.log("Warming up...");
populateOrderSummary_Original(items.slice(0, 10), products.slice(0, 10));
populateOrderSummary_Optimized(items.slice(0, 10), products.slice(0, 10));

console.log("Measuring Original...");
const startOriginal = performance.now();
for (let i = 0; i < 100; i++) {
    populateOrderSummary_Original(items, products);
}
const endOriginal = performance.now();
const timeOriginal = endOriginal - startOriginal;

console.log(`Original Time: ${timeOriginal.toFixed(2)} ms`);


console.log("Measuring Optimized...");
const startOptimized = performance.now();
for (let i = 0; i < 100; i++) {
    populateOrderSummary_Optimized(items, products);
}
const endOptimized = performance.now();
const timeOptimized = endOptimized - startOptimized;

console.log(`Optimized Time: ${timeOptimized.toFixed(2)} ms`);
console.log(`Speedup: ${(timeOriginal / timeOptimized).toFixed(2)}x`);
