import express from "express";
import { registerUser, loginUser } from "../services/authService.js";

const router = express.Router();

// Register a new user
router.post("/register", registerUser);

// Login a user
router.post("/login", loginUser);

export default authRoutes;
