import mongoose from "mongoose";

const failedAttemptsSchema = new mongoose.Schema({
    clientId: { type: String, required: true, unique: true },
    attempts: { type: Number, default: 0 },
    lastAttempt: { type: Date, default: Date.now }
});

const FailedAttempt = mongoose.model("FailedAttempt", failedAttemptsSchema);

export default FailedAttempt;
