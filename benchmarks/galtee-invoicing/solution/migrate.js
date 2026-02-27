const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
require("dotenv").config({ path: "./.env" });

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
});

const DB_PATH = path.join(__dirname, "../db/galtee_data.db");
const CSV_PATH = path.join(__dirname, "../db/galtee_purchases.csv");

// Product pricing configuration (in cents)
const PRODUCT_CONFIG = {
  fr_hike: {
    name: "French Alps hike",
    prices: {
      eur: 32500,
      usd: 35000,
      gbp: 30000,
    },
  },
  gb_hike: {
    name: "Great Britain hike",
    prices: {
      eur: 24000,
      gbp: 20000,
    },
  },
  painters_way: {
    name: "Painter's Way",
    prices: {
      eur: 100000,
      usd: 120000,
    },
  },
};

// Parse date from CSV format to YYYY-MM-DD
function parseDate(dateStr) {
  const months = {
    January: "01",
    February: "02",
    March: "03",
    April: "04",
    May: "05",
    June: "06",
    July: "07",
    August: "08",
    September: "09",
    October: "10",
    November: "11",
    December: "12",
  };

  // Parse "June 8th, 2025" format
  const match = dateStr.match(/(\w+)\s+(\d+)[a-z]*,\s+(\d+)/);
  if (!match) {
    throw new Error(`Unable to parse date: ${dateStr}`);
  }

  const [, month, day, year] = match;
  const monthNum = months[month];
  const dayNum = day.padStart(2, "0");

  return `${year}-${monthNum}-${dayNum}`;
}

// Parse amount from CSV (e.g., "325.00 EUR" or "0 GBP")
function parseAmount(amountStr) {
  const match = amountStr.match(/([\d.]+)\s+([A-Z]+)/);
  if (!match) {
    return { amount: 0, currency: null };
  }

  const [, amount, currency] = match;
  return {
    amount: Math.round(parseFloat(amount) * 100), // Convert to cents
    currency: currency.toLowerCase(),
  };
}

async function createDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}

async function createBookingsTable(db) {
  return new Promise((resolve, reject) => {
    db.run(
      `
      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id TEXT NOT NULL,
        method TEXT NOT NULL,
        customer TEXT NOT NULL,
        amount_paid INTEGER NOT NULL,
        currency TEXT NOT NULL,
        stripe_transaction_id TEXT,
        stripe_invoice_id TEXT NOT NULL,
        purchase_date TEXT NOT NULL
      )
    `,
      (err) => {
        if (err) {
          reject(err);
        } else {
          console.log("✓ Created bookings table");
          resolve();
        }
      }
    );
  });
}

async function createStripeProducts() {
  const productIds = {};
  const priceIds = {}; // Store price IDs by product and currency

  for (const [productId, config] of Object.entries(PRODUCT_CONFIG)) {
    try {
      // Create product in Stripe
      const product = await stripe.products.create({
        name: config.name,
        metadata: {
          product_id: productId,
        },
      });

      console.log(`✓ Created Stripe product: ${productId} (${product.id})`);
      productIds[productId] = product.id;
      priceIds[productId] = {};

      // Create prices for each currency
      for (const [currency, amount] of Object.entries(config.prices)) {
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: amount,
          currency: currency,
        });
        priceIds[productId][currency] = price.id;
        console.log(`  ✓ Created price: ${amount} ${currency} (${price.id})`);
      }
    } catch (error) {
      console.error(`Error creating product ${productId}:`, error.message);
      throw error;
    }
  }

  return { productIds, priceIds };
}

async function createInvoiceForBooking(
  productId,
  stripePriceId,
  customer,
  amount,
  currency
) {
  try {
    // Create or retrieve customer
    const customers = await stripe.customers.list({
      email: customer,
      limit: 1,
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create({
        email: customer,
      });
      customerId = newCustomer.id;
    }

    // Create invoice from the invoice item
    const invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: "send_invoice",
      days_until_due: 30,
      auto_advance: false,
      currency: currency,
    });

    // Add invoice item to the invoice
    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      pricing: {
        price: stripePriceId,
      },
    });

    await stripe.invoices.finalizeInvoice(invoice.id);

    // If amount paid > 0, finalize and mark as paid
    if (amount > 0) {
      await stripe.invoices.pay(invoice.id, {
        paid_out_of_band: true,
      });
    }

    return invoice.id;
  } catch (error) {
    console.error("Error creating invoice:", error.message);
    throw error;
  }
}

async function migrateCSVData(db, stripeProductIds, stripePriceIds) {
  return new Promise((resolve, reject) => {
    const bookings = [];

    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on("data", (row) => {
        bookings.push(row);
      })
      .on("end", async () => {
        console.log(`\nMigrating ${bookings.length} bookings...`);

        try {
          for (let i = 0; i < bookings.length; i++) {
            console.log("Migrating booking:", bookings[i]);

            const booking = bookings[i];
            const productId = booking.product;
            const purchaseDate = parseDate(booking.purchase_time);
            const customer = booking.email;
            const method = booking.method;
            const { amount, currency } = parseAmount(booking.amount_paid);

            // Get the price ID for this product/currency combination
            const productPrices = stripePriceIds[productId];
            const priceId = productPrices && productPrices[currency];
            if (!priceId) {
              throw new Error(`No price found for ${productId} in ${currency}`);
            }

            // Create invoice in Stripe
            const invoiceId = await createInvoiceForBooking(
              productId,
              priceId,
              customer,
              amount,
              currency
            );

            // Insert into database
            await new Promise((resolveInsert, rejectInsert) => {
              db.run(
                `
                INSERT INTO bookings (
                  product_id, method, customer, amount_paid, currency,
                  stripe_transaction_id, stripe_invoice_id, purchase_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `,
                [
                  productId,
                  method,
                  customer,
                  amount,
                  currency,
                  null, // stripe_transaction_id not set for phone bookings
                  invoiceId,
                  purchaseDate,
                ],
                (err) => {
                  if (err) {
                    rejectInsert(err);
                  } else {
                    resolveInsert();
                  }
                }
              );
            });

            if ((i + 1) % 10 === 0) {
              console.log(`  ✓ Migrated ${i + 1}/${bookings.length} bookings`);
            }
          }

          console.log(`✓ Migrated all ${bookings.length} bookings`);
          resolve();
        } catch (error) {
          reject(error);
        }
      })
      .on("error", reject);
  });
}

async function main() {
  console.log("Starting migration...\n");

  try {
    // Create database connection
    const db = await createDatabase();
    console.log("✓ Connected to database");

    // Create bookings table
    await createBookingsTable(db);

    // Create Stripe products
    console.log("\nCreating Stripe products...");
    const { productIds: stripeProductIds, priceIds: stripePriceIds } =
      await createStripeProducts();

    // Migrate CSV data
    await migrateCSVData(db, stripeProductIds, stripePriceIds);

    // Close database
    await new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    console.log("\n✓ Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main();
