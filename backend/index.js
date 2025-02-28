import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoute.js";
import clientRoutes from "./routes/clientRoute.js";

dotenv.config();
const app = express();

app.use(express.json()); // Enable JSON parsing for requests

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/client", clientRoutes);

// Connect to MongoDB
const PORT = process.env.PORT || 5000;
mongoose
    .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("✅ Connected to MongoDB");
        app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    })
    .catch((error) => console.error("❌ MongoDB connection failed:", error));
