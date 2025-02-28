import crypto from "crypto";
import bcrypt from "bcrypt";
import randomstring from "randomstring";
import Client from "../models/clientSchema";
import FailedAttempt from "../models/failedAttemptSchema";

const PEPPER = process.env.SECRET_PEPPER || "SuperSecretPepperKey";
const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_RESET_TIME = 10 * 60 * 1000; // 10 minutes

// 📌 Register a new Client
export const registerClient = async (req, res) => {
    try {
        const clientId = crypto.randomUUID();
        const clientSecret = randomstring.generate(32);

        // Generate HMAC-SHA256 hash before bcrypt
        const hmacSecret = crypto.createHmac("sha256", PEPPER).update(clientSecret).digest("hex");
        const hashedSecret = await bcrypt.hash(hmacSecret, 10);

        await Client.create({ clientId, hashedSecret });

        console.log(`🔑 Client Secret: ${clientSecret}`); // Log but don't expose in production

        res.json({ clientId, clientSecret });
    } catch (error) {
        console.error("❌ Registration failed:", error);
        res.status(500).json({ error: "Client registration failed" });
    }
};

// 📌 Verify Client Credentials
export const verifyClient = async (clientId, clientSecret) => {
    try {
        const client = await Client.findOne({ clientId });

        if (!client) {
            console.error("❌ Client not found!");
            return false;
        }

        // Check if the client has exceeded failed attempts
        const failedAttempt = await FailedAttempt.findOne({ clientId });
        if (failedAttempt && failedAttempt.attempts >= MAX_FAILED_ATTEMPTS) {
            const timeSinceLastAttempt = Date.now() - failedAttempt.lastAttempt;
            if (timeSinceLastAttempt < ATTEMPT_RESET_TIME) {
                console.error("🚫 Too many failed attempts. Try again later.");
                return false;
            } else {
                // Reset attempts after cooldown
                await FailedAttempt.updateOne({ clientId }, { $set: { attempts: 0, lastAttempt: Date.now() } });
            }
        }

        if (!clientSecret || !client.hashedSecret) {
            console.error("❌ Missing clientSecret or hashedSecret");
            return false;
        }

        // Generate HMAC-SHA256 before comparison
        const hmacSecret = crypto.createHmac("sha256", PEPPER).update(clientSecret).digest("hex");

        const isMatch = await bcrypt.compare(hmacSecret, client.hashedSecret);

        if (!isMatch) {
            console.error("❌ Client secret mismatch!");
            await FailedAttempt.updateOne(
                { clientId },
                { $inc: { attempts: 1 }, $set: { lastAttempt: Date.now() } },
                { upsert: true }
            );
            return false;
        }

        // ✅ Reset failed attempts on successful verification
        await FailedAttempt.deleteOne({ clientId });

        return true;
    } catch (error) {
        console.error("❌ Verification error:", error);
        return false;
    }
};

// 📌 Upload Required Fields
export const uploadFields = async (req, res) => {
    try {
        console.log("📥 Incoming Request Body:", req.body);

        const { clientId, clientSecret, fields } = req.body;

        // Validate input
        if (!clientId || !clientSecret || !Array.isArray(fields) || fields.some(f => typeof f !== "string")) {
            return res.status(400).json({ error: "Invalid request format" });
        }

        // Verify client credentials
        const client = await Client.findOne({ clientId });
        if (!client) {
            return res.status(401).json({ error: "Unauthorized: Client not found" });
        }

        // Check secret
        const hmacSecret = crypto.createHmac("sha256", PEPPER).update(clientSecret).digest("hex");
        const isMatch = await bcrypt.compare(hmacSecret, client.hashedSecret);
        if (!isMatch) {
            return res.status(401).json({ error: "Unauthorized: Invalid secret" });
        }

        // Store the required fields
        client.requiredFields = fields;
        await client.save();

        res.json({ message: "✅ Fields stored successfully!", fields });
    } catch (error) {
        console.error("❌ Field upload failed:", error);
        res.status(500).json({ error: "Field upload failed" });
    }
};
