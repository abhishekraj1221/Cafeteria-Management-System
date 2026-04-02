const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");

const app = express();

// ✅ Enable CORS for all requests
app.use(cors());
app.use(express.json()); // Allow JSON request body

// ✅ Initialize Razorpay
const razorpay = new Razorpay({
    key_id: "rzp_test_2aZZ79f8hPihwb",
    key_secret: "JPn0jDVeq2laGE04R0EOVSN8" // Replace with your actual secret key
});

// ✅ API route to create an order
app.post("/create-order", async (req, res) => {
    try {
        const options = {
            amount: req.body.amount * 100, // Convert ₹ to paise
            currency: req.body.currency,
            receipt: "order_rcptid_11"
        };

        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).send({ error: "Failed to create order" });
    }
});

// ✅ Start the server
app.listen(3000, () => console.log("Server running on http://localhost:3000"));
