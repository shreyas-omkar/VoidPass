import mongoose from "mongoose";

const clientSchema = new mongoose.Schema({
    clientId: { type: String, required: true, unique: true },
    hashedSecret: { type: String, required: true }, // Encrypted client secret
    users: [
        {
            userID: { type: String, required: true, unique: true },  // Unique user identifier
            secretShare: { type: String, required: true }, // User's share of the secret
            registeredAt: { type: Date, default: Date.now }
        }
    ], // Users stored directly within client schema
    requiredFields: { type: [String], default: [] }, // Fields required for authentication
    createdAt: { type: Date, default: Date.now }
});

const Client = mongoose.model("Client", clientSchema);

export default Client;
