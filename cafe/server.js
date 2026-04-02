// // Load environment variables
// require('dotenv').config();

// const express = require("express");
// const cors = require("cors");
// const bodyParser = require("body-parser");
// const nodemailer = require("nodemailer");
// const crypto = require("crypto");
// const Razorpay = require("razorpay");
// const mysql = require("mysql2/promise");

// const app = express();
// const port = process.env.PORT || 5000;

// app.use(express.json());
// app.use(cors({
//     origin: '*',
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization']
// }));
// app.use(bodyParser.json());

// // Test endpoint to verify server is running
// app.get("/test", (req, res) => {
//     res.json({ message: "Server is running!", status: "ok" });
// });

// // Razorpay Keys from environment variables
// const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_2aZZ79f8hPihwb";
// const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "JPn0jDVeq2laGE04R0EOVSN8";

// const razorpay = new Razorpay({
//     key_id: RAZORPAY_KEY_ID,
//     key_secret: RAZORPAY_KEY_SECRET
// });

// // MySQL Connection (XAMPP)
// const pool = mysql.createPool({
//     host: process.env.DB_HOST || 'localhost',
//     user: process.env.DB_USER || 'root',
//     password: process.env.DB_PASSWORD || '',
//     database: process.env.DB_NAME || 'cafeteria_db',
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0
// });

// // Check DB Connection
// pool.getConnection()
//     .then(connection => {
//         console.log("✅ Connected to MySQL (XAMPP)");
//         console.log(`📊 Database: ${process.env.DB_NAME || 'cafe_db'}`);
//         connection.release();
//     })
//     .catch(err => {
//         console.error("❌ MySQL connection failed: ", err);
//         console.log("💡 Make sure MySQL is running in XAMPP and database exists");
//     });


// // ====================== ADMIN LOGIN ======================
// app.post("/admin_login", async (req, res) => {
//     const { username, password } = req.body;

//     const query = "SELECT * FROM admin WHERE username = ? AND password = ?";

//     try {
//         const [result] = await pool.query(query, [username, password]);

//         if (result.length > 0) {
//             return res.json({ success: true, message: "Login successful!" });
//         } else {
//             return res.status(401).json({ message: "Invalid username or password." });
//         }
//     } catch (err) {
//         console.error("Database error:", err);
//         return res.status(500).json({ message: "Server error. Try again later." });
//     }
// });


// // ====================== PLACE ORDER ======================
// app.post("/place-order", async (req, res) => {
//     const { customer_name, phone, table_number, final_total, cart } = req.body;

//     if (!customer_name || !phone || !table_number || !Array.isArray(cart)) {
//         return res.status(400).json({ error: "Missing or invalid data" });
//     }

//     try {
//         // Check if table is available
//         const [tableCheck] = await pool.query(
//             "SELECT status FROM cafe_tables WHERE table_number = ?",
//             [table_number]
//         );

//         if (tableCheck.length === 0) {
//             return res.status(400).json({ error: "Invalid table number" });
//         }

//         if (tableCheck[0].status !== 'available') {
//             return res.status(400).json({ error: `Table ${table_number} is currently occupied. Please select another table.` });
//         }

//         // Insert into orders
//         const orderQuery = `
//             INSERT INTO orders (customer_name, phone, table_number, final_total)
//             VALUES (?, ?, ?, ?)
//         `;

//         const [orderResult] = await pool.query(orderQuery, [
//             customer_name, phone, table_number, final_total
//         ]);

//         const orderId = orderResult.insertId;

//         // Insert items
//         const itemQuery = `
//             INSERT INTO order_items (order_id, item_name, item_price, quantity)
//             VALUES (?, ?, ?, ?)
//         `;

//         for (let item of cart) {
//             await pool.query(itemQuery, [
//                 orderId, item.name, item.price, item.quantity
//             ]);
//         }

//         // Mark table as occupied
//         await pool.query(
//             "UPDATE cafe_tables SET status = 'occupied', current_order_id = ? WHERE table_number = ?",
//             [orderId, table_number]
//         );

//         res.json({ success: true, message: "Order placed successfully!" });

//     } catch (err) {
//         console.error("Order saving error:", err);
//         return res.status(500).json({ error: "Failed to save order" });
//     }
// });


// // ====================== FETCH ORDERS ======================
// app.get("/get-orders", async (req, res) => {
//     const query = `
//         SELECT 
//             o.id AS order_id, 
//             o.customer_name, 
//             o.phone, 
//             o.table_number, 
//             o.final_total, 
//             o.status,
//             GROUP_CONCAT(CONCAT(oi.item_name, ' (Q', oi.quantity, ')') SEPARATOR ', ') AS order_details
//         FROM orders o
//         LEFT JOIN order_items oi ON o.id = oi.order_id
//         WHERE o.status = 'Pending'
//         GROUP BY o.id
//     `;

//     try {
//         const [result] = await pool.query(query);
//         res.json(result);
//     } catch (err) {
//         console.error("Error fetching orders:", err);
//         return res.status(500).json({ error: "Failed to fetch orders" });
//     }
// });


// // ====================== COMPLETE ORDER ======================
// app.delete('/complete-order/:id', async (req, res) => {
//     const orderId = req.params.id;

//     try {
//         // Get table number before deleting order
//         const [orderResult] = await pool.query("SELECT table_number FROM orders WHERE id = ?", [orderId]);
        
//         if (orderResult.length > 0) {
//             const tableNumber = orderResult[0].table_number;
            
//             // Delete order items and order
//             await pool.query("DELETE FROM order_items WHERE order_id = ?", [orderId]);
//             await pool.query("DELETE FROM orders WHERE id = ?", [orderId]);
            
//             // Free the table
//             await pool.query(
//                 "UPDATE cafe_tables SET status = 'available', current_order_id = NULL WHERE table_number = ?",
//                 [tableNumber]
//             );
//         }

//         res.json({ message: "Order deleted successfully" });

//     } catch (err) {
//         console.error("Error deleting order:", err);
//         return res.status(500).json({ error: "Failed to delete order" });
//     }
// });


// // ====================== RAZORPAY - CREATE ORDER ======================
// app.post('/create-payment-order', async (req, res) => {
//     try {
//         const { amount, currency = 'INR' } = req.body;
        
//         if (!amount || amount <= 0) {
//             return res.status(400).json({ error: 'Invalid amount' });
//         }

//         const options = {
//             amount: Math.round(amount * 100),
//             currency: currency,
//             receipt: `receipt_${Date.now()}`,
//             payment_capture: 1
//         };

//         const order = await razorpay.orders.create(options);
//         res.json({ 
//             success: true, 
//             order_id: order.id,
//             amount: order.amount,
//             currency: order.currency
//         });
//     } catch (error) {
//         console.error('Error creating Razorpay order:', error);
//         res.status(500).json({ error: 'Failed to create payment order' });
//     }
// });


// // ====================== VERIFY PAYMENT ======================
// app.post('/verify-payment', (req, res) => {
//     const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
//     const generated_signature = crypto
//         .createHmac('sha256', RAZORPAY_KEY_SECRET)
//         .update(razorpay_order_id + "|" + razorpay_payment_id)
//         .digest('hex');

//     if (generated_signature === razorpay_signature) {
//         res.json({ success: true, message: 'Payment verified successfully' });
//     } else {
//         res.status(400).json({ success: false, message: 'Payment verification failed' });
//     }
// });


// // ====================== GET AVAILABLE TABLES ======================
// app.get("/get-available-tables", async (req, res) => {
//     console.log("📋 GET /get-available-tables endpoint hit");
//     try {
//         // First check if table exists, if not, create it with default tables
//         try {
//             const [tableCheck] = await pool.query("SHOW TABLES LIKE 'cafe_tables'");
            
//             if (tableCheck.length === 0) {
//                 console.log("Creating cafe_tables table...");
//                 // Create table if it doesn't exist
//                 await pool.query(`
//                     CREATE TABLE IF NOT EXISTS cafe_tables (
//                         id INT AUTO_INCREMENT PRIMARY KEY,
//                         table_number INT UNIQUE NOT NULL,
//                         status ENUM('available', 'occupied', 'reserved') DEFAULT 'available',
//                         capacity INT DEFAULT 4,
//                         current_order_id INT NULL,
//                         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
//                     )
//                 `);
                
//                 console.log("Inserting default tables...");
//                 // Insert default tables one by one to avoid conflicts
//                 for (let i = 1; i <= 20; i++) {
//                     const capacity = i <= 10 ? 4 : (i <= 14 ? 6 : (i === 15 ? 8 : 2));
//                     try {
//                         await pool.query(
//                             "INSERT INTO cafe_tables (table_number, status, capacity) VALUES (?, ?, ?)",
//                             [i, 'available', capacity]
//                         );
//                     } catch (insertErr) {
//                         // Ignore duplicate key errors
//                         if (!insertErr.message.includes('Duplicate entry')) {
//                             console.error(`Error inserting table ${i}:`, insertErr.message);
//                         }
//                     }
//                 }
                
//                 console.log("✅ Created cafe_tables and inserted default tables");
//             }
//         } catch (createErr) {
//             console.error("Error checking/creating cafe_tables:", createErr.message);
//             // If table creation fails, return empty array instead of error
//             return res.json([]);
//         }
        
//         // Try to fetch tables
//         try {
//             const [result] = await pool.query(
//                 "SELECT table_number, status, capacity FROM cafe_tables WHERE status = 'available' ORDER BY table_number"
//             );
//             console.log(`✅ Found ${result ? result.length : 0} available tables`);
//             return res.json(result || []);
//         } catch (queryErr) {
//             console.error("❌ Error querying cafe_tables:", queryErr.message);
//             console.error("Error code:", queryErr.code);
//             // If table doesn't exist, return empty array
//             if (queryErr.code === 'ER_NO_SUCH_TABLE' || queryErr.code === '42S02') {
//                 console.log("Table doesn't exist, returning empty array");
//                 return res.json([]);
//             }
//             // For other errors, return empty array instead of failing
//             return res.json([]);
//         }
//     } catch (err) {
//         console.error("❌ Error in get-available-tables:", err.message);
//         console.error("Error stack:", err.stack);
//         // Always return JSON, even on error
//         return res.status(500).json({ error: "Failed to fetch available tables", details: err.message });
//     }
// });

// // ====================== GET ALL TABLES (for admin) ======================
// app.get("/get-all-tables", async (req, res) => {
//     try {
//         const [result] = await pool.query(
//             "SELECT table_number, status, capacity, current_order_id FROM cafe_tables ORDER BY table_number"
//         );
//         res.json(result);
//     } catch (err) {
//         console.error("Error fetching all tables:", err);
//         return res.status(500).json({ error: "Failed to fetch tables" });
//     }
// });

// // ====================== FEEDBACK ======================
// app.post('/feedback', async (req, res) => {
//     const { name, email, subject, message, timestamp } = req.body;
    
//     const query = `
//         INSERT INTO feedback (name, email, subject, message, timestamp)
//         VALUES (?, ?, ?, ?, ?)
//     `;

//     try {
//         await pool.query(query, [name, email, subject, message, timestamp]);
//         res.status(200).json({ success: true, message: 'Feedback stored successfully' });
//     } catch (error) {
//         console.error('Error storing feedback:', error);
//         return res.status(500).json({ success: false, message: 'Failed to store feedback' });
//     }
// });


// // ====================== ERROR HANDLING MIDDLEWARE ======================
// app.use((err, req, res, next) => {
//     console.error("Unhandled error:", err);
//     res.status(500).json({ error: "Internal server error", details: err.message });
// });

// // 404 handler - always return JSON (must be last, after all routes)
// app.use((req, res) => {
//     console.log(`❌ 404 - Route not found: ${req.method} ${req.path}`);
//     res.status(404).json({ 
//         error: "Endpoint not found", 
//         path: req.path,
//         method: req.method,
//         message: `Cannot ${req.method} ${req.path}`
//     });
// });

// // ====================== VERIFY ROUTES ARE REGISTERED ======================
// // Log all registered routes
// const routes = [];
// app._router.stack.forEach((middleware) => {
//     if (middleware.route) {
//         const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
//         routes.push(`${methods} ${middleware.route.path}`);
//     }
// });

// // ====================== START SERVER ======================
// app.listen(port, () => {
//     console.log(`🚀 Server running on port ${port}`);
//     console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
//     console.log(`📡 Registered routes:`);
//     routes.forEach(route => console.log(`   ${route}`));
//     console.log(`\n✅ Server ready! Test at: http://localhost:${port}/test`);
// });
