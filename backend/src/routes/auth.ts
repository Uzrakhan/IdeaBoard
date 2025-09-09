import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { body, validationResult } from 'express-validator';
import dotenv from 'dotenv'
import { googleLogin } from '../controllers/googleAuthController';
import logger from '../utils/logger';

dotenv.config();
const router = express.Router();


// --- TEMPORARY DIAGNOSTIC ROUTE  ---//
router.get('/test-subroute', (req: express.Request,res: express.Response) => {
    console.log('[Server] /test-route was hit successfully!');
    res.status(200).json({ message: 'Test route is working!' });
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

router.get("/test-route", (req: any, res: any) => {
  res.send("✅ Test route from auth router works!");
})



router.post('/signup', [...usernameValidationRules, ...passwordValidationRules],
    async (req: express.Request, res: express.Response) => {
        logger.info(`Signup request received for username: ${req.body.username}`)
        //check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn(`Signup validation failed for username: ${req.body.username}. Errors: ${JSON.stringify(errors.array())}`);
            return res.status(400).json({ errors: errors.array(), message: 'Validation failed.' });
        }

        const {username, password} = req.body;

        try{
            //check if user exits
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                logger.warn(`Signup attempt failed: Username already exists for ${username}.`);
                return res.status(400).json({ message: 'Username already exists' });
            }


            //create new user
            const hashedPassword = await bcrypt.hash(password, 12);
            const newUser = new User({ username, password: hashedPassword });
            await newUser.save();

            //generate token
            const jwtSecret = process.env.JWT_SECRET;
            if(!jwtSecret) {
                logger.error('JWT_SECRET is not defined in the environment variables.');
                return res.status(500).json({ message: 'Server configuration error.' });
            }

            const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET as string, {
                expiresIn: '1d'
            });

            logger.info(`New user signed up successfully: ${username}`);
            res.status(201).json({ token, userId: newUser._id, username: newUser.username })
        }catch(err: any) {
            logger.error(`Signup server error for username: ${username}. Error: ${err.message}`, { error: err });
            res.status(500).json({ message: 'Server error' });
        }
});

router.post('/login', [
    body('username', 'Username is required.').not().isEmpty(),
    body('password', 'Password is required.').not().isEmpty()
],
    async (req: express.Request, res: express.Response) => {

        logger.info(`Login attempt received for username: ${req.body.username}`);
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn(`Login validation failed for username: ${req.body.username}.`);
            return res.status(400).json({ errors: errors.array(), message: 'Validation failed.' });
        }

        const {username, password} = req.body;

        try{
            //check if user exists
            const user = await User.findOne({username});
            if (!user) {
                logger.warn(`Login attempt failed: User not found for username ${username}`);
                return res.status(400).json({message: 'Invalid credentials.'})
            }

            if (!user.password) {
                logger.info(`Login attempt failed: User ${username} tried to use manual login on a Google-only account.`);
                return res.status(400).json({ message: 'This account uses Google login. Please sign in with Google.' });
            }
            //validate password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                logger.warn(`Login attempt failed: Invalid password for username ${username}`);
                return res.status(400).json({ message: 'Invalid credentials' })
            }

            //generate token
            const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
                logger.error('JWT_SECRET is not defined!');
                return res.status(500).json({ message: 'Server configuration error.' });
            }

            const token = jwt.sign({id: user._id}, process.env.JWT_SECRET as string, {
                expiresIn: '1d'
            });

            logger.info(`Successful login for user: ${username}`);
            res.json({
                token, 
                user: {
                    _id: user._id, 
                    username: user.username
                }
            })
        }catch(err: any) {
            logger.error(`Login server error for username ${req.body.username}: ${err.message}`, { error: err });
            res.status(500).json({ message: 'Server error' });
        }
});

router.post('/google', googleLogin);


export default router;