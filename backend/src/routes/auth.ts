import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { body, validationResult } from 'express-validator';


const router = express.Router();

// --- TEMPORARY DIAGNOSTIC ROUTE  ---//
router.post('/test-subroute', (req: express.Request,res: express.Response) => {
    console.log('[DIAGNOSTIC AUTH ROUTER] Hit temporary /test-subroute!');
    res.status(200).json({ message: 'Auth sub-route hit successfully!' });
})
//validation rules for username & password
const usernameValidationRules = [
    body('username', 'Username is required.').not().isEmpty(),
    body('username', 'Username must be at least 3 characters long.').isLength({ min: 3 }),
    body('username', 'Username cannot exceed 20 characters.').isLength({ max: 20 }),
    body('username', 'Username can only contain letters, numbers, and underscores.')
        .matches(/^[a-zA-Z0-9_]+$/)
]

const passwordValidationRules = [
    body('password', 'Password is required.').not().isEmpty(),
    body('password', 'Password must be at least 6 characters long.').isLength({ min: 6 }),
    body('password', 'Password cannot exceed 50 characters.').isLength({ max: 50 }),
    body('password', 'Password must include at least one uppercase letter.').matches(/[A-Z]/),
    body('password', 'Password must include at least one lowercase letter.').matches(/[a-z]/),
    body('password', 'Password must include at least one number.').matches(/[0-9]/),
    body('password', 'Password must include at least one special character.').matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)
]


router.post('/signup', [...usernameValidationRules, ...passwordValidationRules],
    async (req: express.Request, res: express.Response) => {
        console.log('[Signup Request] Received body:', req.body);
        //check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.error('[Signup Validation Error] Details:', errors.array());
            return res.status(400).json({ errors: errors.array(), message: 'Validation failed.' });
        }

        const {username, password} = req.body;

        try{
            //check if user exits
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                console.warn(`[Signup] Attempted signup for existing username: ${username}`);
                return res.status(400).json({ message: 'Username already exists' });
            }


            //create new user
            const hashedPassword = await bcrypt.hash(password, 12);
            const newUser = new User({ username, password: hashedPassword });
            await newUser.save();

            //generate token
            const jwtSecret = process.env.JWT_SECRET;
            if(!jwtSecret) {
                console.error('JWT_SECRET is not defined!');
                return res.status(500).json({ message: 'Server configuration error.' });
            }

            const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET as string, {
                expiresIn: '1d'
            });

            console.log(`[Signup Success] User ${username} created with ID: ${newUser._id}`);
            res.status(201).json({ token, userId: newUser._id, username: newUser.username })
        }catch(err: any) {
            console.error('Signup error:', err.message); // Log the actual error
            res.status(500).json({ message: 'Server error' });
        }
});

router.post('/login', [
    body('username', 'Username is required.').not().isEmpty(),
    body('password', 'Password is required.').not().isEmpty()
],
    async (req: express.Request, res: express.Response) => {

    console.log('[Backend] Attempting Login for username:', req.body.username);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array(), message: 'Validation failed.' });
    }

    const {username, password} = req.body;

    try{
        //check if user exists
        const user = await User.findOne({username});
        if (!user) {
            return res.status(400).json({message: 'Invalid credentials.'})
        }

        //validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' })
        }

        //generate token
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET is not defined!');
            return res.status(500).json({ message: 'Server configuration error.' });
        }

        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET as string, {
            expiresIn: '1d'
        });

        res.json({token, userId: user._id, username: user.username})
    }catch(err: any) {
        console.error('Login error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});


export default router;