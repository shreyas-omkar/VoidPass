import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv'
import secrets from 'secrets.js-grempe'
import  {ethers} from 'ethers'
import mongoose from 'mongoose';
import clientSchema from '../models/clientSchema.js';

dotenv.config()

const Client = mongoose.model('Client', clientSchema);

const signWithSSS = async (clientID, payload) => {
    try {
        const userID = crypto.randomBytes(16).toString('hex')
        const secretKey = crypto.randomBytes(32).toString('hex');
        const token = jwt.sign(payload, secretKey, { expiresIn: '1h' });
        const encryptedSecret = jwt.sign({ key: secretKey }, process.env.JWT_SECRET);
        const shares = secrets.share(secrets.str2hex(encryptedSecret), 2, 2);

        const client = await Client.findOne({ clientID })
        if (!client) {
            console.error("Client Not Found");
            return { error: "Client not found" };
        }
        client.users.push({
            userID: userID,
            secretShare: shares[1]
        });

        await client.save();
        return { userID: userID, token: token, userShare: shares[0] }
    } catch (error) {
        console.error(" Error in signWithSSS:", error);
        return { error: "Something went wrong" };
    }

}

const verifyWithSSS = async (clientId, userId, token, clientShare) => {
    try {
        // Find client
        const client = await Client.findOne({ clientId });
        if (!client) {
            console.error("Client Not Found");
            return { error: "Client Not Found" };
        }

        // Find user in client.users array
        const user = client.users.find(u => u.userID === userId);
        if (!user) {
            console.error("User Not Found in Client");
            return { error: "User Not Found" };
        }

        const reconstructedSecret = secrets.combine([user.secretShare, clientShare]);
        const encryptedSecret = secrets.hex2str(reconstructedSecret);
        let decodedSecret;
        try {
            decodedSecret = jwt.verify(encryptedSecret, process.env.JWT_SECRET);
        } catch (error) {
            console.error("Secret Reconstruction Failed");
            return { error: "Secret Reconstruction Failed" };
        }
        try {
            const decodedToken = jwt.verify(token, decodedSecret.key);
            const filteredData = {};
            requestedFields.forEach(field => {
                if (decodedToken[field] !== undefined) {
                    filteredData[field] = decodedToken[field];
                }
            });
            return { valid: true, data: filteredData };
        } catch (error) {
            console.error("Token Verification Failed");
            return { error: "Invalid Token" };
        }
    } catch (error) {
        console.error("Error in verifyWithSSS:", error);
        return { error: "Something went wrong" };
    }
};

export const registerUser = async (clientID, address, signature, message, userInput) => {
    try {
        
        const recoveredAddress = ethers.utils.verifyMessage(message, signature);
        if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
            return { error: "Signature verification failed" };
        }
        const client = await Client.findOne({ clientID });
        if (!client) {
            return { error: "Client not found" };
        }
    
        const requiredFields = client.customFields || [];
        const userFields = {};
    
        for (const field of requiredFields) {
            if (!userInput[field]) {
                return { error: 'Missing required field: ${field}' };
            }
            userFields[field] = userInput[field]; // Store only valid fields
        }
    
        const payload = {
            address,
            signature,
            message,
            recoveredAddress,
            userFields,
            timestamp: Date.now(),
        };
    
        return await signWithSSS(clientID, payload);
    } catch (error) {
        console.error("Error in registerUser:", error);
        return { error: "Something went wrong" };
    }
}

export const loginUser = async (clientID, userID, address, signature, message, clientShare, requestedFields = []) => {
    try {
        const recoveredAddress = ethers.utils.verifyMessage(message, signature);
        if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
            return { error: "Signature verification failed" };
        }

        const client = await Client.findOne({ clientID });
        if (!client) return { error: "Client not found" };

        const user = client.users.find((u) => u.userID === userID);
        if (!user) return { error: "User not registered" };

        // Step 4: Decrypt Token Using verifyWithSSS
        const verificationResult = await verifyWithSSS(clientID, userID, clientShare, requestedFields);

        if (verificationResult.error) {
            return { error: verificationResult.error };
        }

        return verificationResult;

    } catch (error) {
        console.error("Error in loginUser:", error);
        return { error: "Something went wrong" };
    }
};
