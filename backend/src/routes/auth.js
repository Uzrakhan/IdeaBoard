"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("../models/User"));
const express_validator_1 = require("express-validator");
const router = express_1.default.Router();
// --- TEMPORARY DIAGNOSTIC ROUTE  ---//
router.post('/test-subroute', (req, res) => {
    console.log('[DIAGNOSTIC AUTH ROUTER] Hit temporary /test-subroute!');
    res.status(200).json({ message: 'Auth sub-route hit successfully!' });
});
//validation rules for username & password
const usernameValidationRules = [
    (0, express_validator_1.body)('username', 'Username is required.').not().isEmpty(),
    (0, express_validator_1.body)('username', 'Username must be at least 3 characters long.').isLength({ min: 3 }),
    (0, express_validator_1.body)('username', 'Username cannot exceed 20 characters.').isLength({ max: 20 }),
    (0, express_validator_1.body)('username', 'Username can only contain letters, numbers, and underscores.')
        .matches(/^[a-zA-Z0-9_]+$/)
];
const passwordValidationRules = [
    (0, express_validator_1.body)('password', 'Password is required.').not().isEmpty(),
    (0, express_validator_1.body)('password', 'Password must be at least 6 characters long.').isLength({ min: 6 }),
    (0, express_validator_1.body)('password', 'Password cannot exceed 50 characters.').isLength({ max: 50 }),
    (0, express_validator_1.body)('password', 'Password must include at least one uppercase letter.').matches(/[A-Z]/),
    (0, express_validator_1.body)('password', 'Password must include at least one lowercase letter.').matches(/[a-z]/),
    (0, express_validator_1.body)('password', 'Password must include at least one number.').matches(/[0-9]/),
    (0, express_validator_1.body)('password', 'Password must include at least one special character.').matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)
];
router.post('/signup', [...usernameValidationRules, ...passwordValidationRules], async (req, res) => {
    console.log('[Signup Request] Received body:', req.body);
    //check for validation errors
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        console.error('[Signup Validation Error] Details:', errors.array());
        return res.status(400).json({ errors: errors.array(), message: 'Validation failed.' });
    }
    const { username, password } = req.body;
    try {
        //check if user exits
        const existingUser = await User_1.default.findOne({ username });
        if (existingUser) {
            console.warn(`[Signup] Attempted signup for existing username: ${username}`);
            return res.status(400).json({ message: 'Username already exists' });
        }
        //create new user
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        const newUser = new User_1.default({ username, password: hashedPassword });
        await newUser.save();
        //generate token
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET is not defined!');
            return res.status(500).json({ message: 'Server configuration error.' });
        }
        const token = jsonwebtoken_1.default.sign({ id: newUser._id }, process.env.JWT_SECRET, {
            expiresIn: '1d'
        });
        console.log(`[Signup Success] User ${username} created with ID: ${newUser._id}`);
        res.status(201).json({ token, userId: newUser._id, username: newUser.username });
    }
    catch (err) {
        console.error('Signup error:', err.message); // Log the actual error
        res.status(500).json({ message: 'Server error' });
    }
});
router.post('/login', [
    (0, express_validator_1.body)('username', 'Username is required.').not().isEmpty(),
    (0, express_validator_1.body)('password', 'Password is required.').not().isEmpty()
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array(), message: 'Validation failed.' });
    }
    const { username, password } = req.body;
    try {
        //check if user exists
        const user = await User_1.default.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }
        //validate password
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        //generate token
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET is not defined!');
            return res.status(500).json({ message: 'Server configuration error.' });
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: '1d'
        });
        res.json({ token, userId: user._id, username: user.username });
    }
    catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map