import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User';

const router = express.Router();

router.post('/signup', async (req: express.Request, res: express.Response) => {
    const {username, password} = req.body;

    try{
        //check if user exits
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }


        //create new user
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();

        //generate token
        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET as string, {
            expiresIn: '1d'
        });

        res.status(201).json({ token, userId: newUser._id })
    }catch(err) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/login', async (req: express.Request, res: express.Response) => {
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
        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET as string, {
            expiresIn: '1d'
        });

        res.json({token, userId: user._id})
    }catch(err) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;