import express from "express";
import { registerClient, uploadFields } from "../services/clientService.js";

const router = express.Router();

// Register a new client
router.post("/register", registerClient);

// Upload required fields for authentication
router.post("/upload-fields", uploadFields);

export default clientRoutes;
