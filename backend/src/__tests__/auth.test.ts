import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '../models/User';
import brcypt from 'bcryptjs';
import { beforeEach, describe, it } from 'node:test';

/*
// Mock JWT_SECRET for tests
process.env.JWT_SECRET = 'super-secret-test-key-for-auth';

//Set NODE_ENV to 'test' to prevent the app from listening on a port
process.env.NODE_ENV = 'test';

let mongoServer: MongoMemoryServer;

// Before all tests, start the in-memory MongoDB server and connect Mongoose
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await connectDB(uri);
})

function beforeAll(arg0: () => Promise<void>) {
    throw new Error('Function not implemented.');
}

// Before each test, clear the User collection
beforeEach(async () => {
    await User.deleteMany({})
})

// After all tests, disconnect Mongoose and stop the in-memory MongoDB server
afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
})

function afterAll(arg0: () => Promise<void>) {
    throw new Error('Function not implemented.');
}


describe('Auth API', () => {
    //signup tests
    describe('POST /api/auth/signup', () => {
        it('should register a new user successfully', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send({
                    username: 'testuser',
                    password: 'password123'
                });
            
            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('token');
            expect(res.body).toHaveProperty('userId');
            expect(res.body).toHaveProperty('username', 'testuser');

        })
    })
})

function expect(received: any) {
    return {
        toEqual(expected: any) {
            if (received !== expected) {
                throw new Error(`Expected ${received} to equal ${expected}`);
            }
        }
    };
}
*/