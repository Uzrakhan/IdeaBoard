import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../src/server';
import User from '../src/models/User';
import Room from '../src/models/Room';
import bcrypt from 'bcryptjs';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { Sign } from 'node:crypto';

process.env.NODE_ENV = 'test';

process.env.JWT_SECRET = 'super-secret-test-key-for-auth-development';

let mongoServer: MongoMemoryServer;

//custom functions to connect Mongoose to in-memory MongoDB
const connectTestDB = async (uri: string) => {
    try{
        await mongoose.connect(uri);
        console.log('✅ Test MongoDB connected successfully for room tests.');
    }catch(err) {
        console.error('❌ Test MongoDB connection error for room tests:', err);
        process.exit(1);
    }
};

// --- Test Lifecycle Hooks for node:test ---

//`test.before` runs once before all tests in this file
test.before(async () => {
    console.log('\n--- Room Test Setup: Starting MongoMemoryServer ---');
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await connectTestDB(uri);
});


// `test.beforeEach` runs before each individual test
test.beforeEach(async () => {
    console.log('--- Room Test: Clearing collections (User, Room) ---');
    //clear both User & Room collections for a clean slate
    await User.deleteMany({});
    await Room.deleteMany({});
});

// `test.after` runs once after all tests in this file are complete
test.after(async() => {
    console.log('\n--- Room Test Teardown: Disconnecting Mongoose and stopping MongoMemoryServer ---');
    await mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop()
    }
    console.log('--- Room Test Teardown Complete ---');
});


// --- Helper function for authentication in tests ---
//This function will register and log in a user, returning their JWT token.
// It uses supertest against your 'app' instance directly.
async function getAuthToken(username = 'testuser', password = 'TestP@ssword123!') {
    //first try to sign up
    let signupRes = await request(app)
        .post('/api/auth/signup')
        .send({ username, password });

    //if signup fails , then try to login.
    //This makes the test setup more robust.
    if (signupRes.statusCode === 400 && signupRes.body.message === 'Username already exists') {
        console.warn(`User ${username} already exists, attempting to log in.`);
        signupRes = await request(app)
            .post('/api/auth/login')
            .send({ username, password })
    }

    assert.ok(signupRes.body.token, `Failed to get token for ${username}. Status: ${signupRes.statusCode}, Body: ${JSON.stringify(signupRes.body)}`);
    return signupRes.body.token;
};

// --- Test Suite: Room API ---
test('Room API Endpoints', async (t) => {

    // --- Nested Test Suite: POST /api/rooms (create room) ---
    await t.test('POST /api/rooms (Create Room)', async (t) => {
        await t.test('should create a new room successfully when authenticated (201 Created)', async () => {
            //get an auth token for a test user
            const authToken = await getAuthToken('roomcreator', 'CreatorP@ss123!');

            const res = await request(app)
                .post('/api/rooms')
                .set('Authorization', `Bearer ${authToken}`) //set authoruzation header with token
                .send({}); // Send an empty body for create room

            assert.strictEqual(res.statusCode, 201, `Expected status 201 for successful room creation, but got ${res.statusCode}.Response: ${JSON.stringify(res.body)}`);
            assert.ok(res.body.message, 'Response should be have a success message');
            assert.strictEqual(res.body.message, 'Room created successfully', 'Success message should match');
            assert.ok(res.body.room, 'Response should contain room data');
            assert.ok(res.body.room.roomCode, 'Room data should contain a room code');
            assert.ok(res.body.room.owner, 'Room data should contain owner ID');

            //optionally verify room in database
            const roomInDb = await Room.findOne({ code: res.body.room.code });
            assert.ok(roomInDb, 'Room should be found in the database');
            assert.strictEqual(roomInDb?.owner.toString(), res.body.room.owner, 'Room owner in DB should match');
        });


        await t.test('should return 401 if not authenticated', async () => {
            const res = await request(app)
                .post('/api/rooms')
                .send({}); // No Authorization header

            assert.strictEqual(res.statusCode, 401, `Expected status 401 for unauthenticated request, but got ${res.statusCode}. Response: ${JSON.stringify(res.body)}`);
            assert.strictEqual(res.body.message, 'Authorization header required', 'Error message should indicate no token');
        });

        await t.test('should return 401 if token is invalid', async () => {
            const res = await request(app)
                .post('/api/rooms')
                .set('Authorization', `Bearer invalid.jwt.token`) // Invalid token
                .send({});

            assert.strictEqual(res.statusCode, 401, `Expected status 401 for invalid token, but got ${res.statusCode}. Response: ${JSON.stringify(res.body)}`);
            assert.strictEqual(res.body.message, 'Invalid token. Please log in again.', 'Error message should indicate invalid token');
        });


    })
})