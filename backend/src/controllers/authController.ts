import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../models/User';
import express from 'express';

dotenv.config()

//creates an instance of Google oauth2 client
//This client is what we will use to verify tokens with Google's servers
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);



export const googleLogin = async (req: express.Request, res: express.Response) => {
    const { credential } = req.body;

    if (!credential) {
        return res.status(400).json({ message: 'Credential not provided.' });
    }

    try {
        console.log('Backend received Google credential:', credential); // <-- Add this log
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        console.log('Google verification successful, payload:', ticket.getPayload()); // <-- Add this log
        const payload = ticket.getPayload();
        if (!payload) {
            return res.status(401).json({ message: 'Invalid token payload.' });
        }

        //extract user info
        const { sub: googleId, email, name, picture } = payload;

        const username = name ? name.toLowerCase().replace(/\s/g, '') + Math.floor(Math.random() * 1000) : email;
        // the sub answers the question that do i know the user or not

        // ----DATABASE-LOGIC----
        // here we will write logic for checking our databse for the user. If they dont exist, we will create one
        // We'll need an immediate if/else statement
        // To check if user exists in db, we will 'query our db'
        // which means rqeuesting an information or performing operations on data in db
        // The unique key or info from Google that doesnt change is = userId
        // So, the if block will contain a db call where we will need to find a user for which  googleId and userId match
        let user = await User.findOne({ $or: [{ googleId }, { email }] });

        //if user exists then:
        // we dont need to create a new user and we simple proceed to next step which is
        // generating and returning a JWT
        if (!user) {
            user = await User.create({
                googleId,
                email,
                name,
                avatar: picture,
                username: name
            });
            console.log("New user created from Google login:", user.get('name'))
        } else {
            //In else block, we need to craete a new user object
            // we have all data we need from Google payload(userId, email, name, picture)
            // we need to save this user to the db this will involve await
            console.log('Existing user logged in:', user.get('name'));
        }

        
        // Create your own application JWT
        // this is a new toke for your app
        const token = jwt.sign(
            { 
                userId: user.get('_id'), 
                email: user.get('email'), 
                name: user.get('name') 
            },
            process.env.JWT_SECRET as string,
            { expiresIn: '1h' }
        );

        res.status(200).json({ 
            message: 'Login successful', 
            token, 
            user: { 
                _id: user.id,
                email: user.email,
                username: user.username,
                picture: user.avatar
            } 
        });

    } catch (error) {
        console.error('Google login authenticaton failed:', error); // <-- Add this log
        res.status(500).json({ message: 'Authentication failed.' });
    }
};