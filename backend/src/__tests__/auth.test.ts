import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import { app }  from '../server';

//Node.js built-in test runner functions
import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert'; // Node.js built-in assertion library

//Mock JWT SECRET for tests - This is crucial for authentication tests
process.env.JWT_SECRET = 'super-secret-test-key-for-auth-development';

//Set NODE_ENV to 'test' to prevent the app from listenig on a port
process.env.NODE_ENV = 'test';

let mongoServer: MongoMemoryServer; // Variable to hold the in-memory Mongodb server


//Custom fucntion to connect Mongoose to the in-memory MongoDB
const connectTestDB = async(uri: string) => {
    try{
        await mongoose.connect(uri);
        console.log('✅ Test MongoDB connected successfully.')
    }catch(err) {
        console.error('❌ Test MongoDB connection error:', err);
        process.exit(1)
    }
}


// --- Test Lifecycle Hooks for node:test ---

//`test.before` runs once before all tests in this file
test.before(async () => {
    console.log('\n--- Global Test Setup: Starting MongoMemoryServer ---');
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await connectTestDB(uri);
});

//`test.beforeEach` runs before each individual test
test.beforeEach(async () => {
    console.log('--- Before Each Test: Clearing User collection ---');
    //ensure the database is clean before each test to prevent test interference
    await User.deleteMany({});
});

//`test.afterEach` runs after each individual test
test.afterEach(async () => {

})

//`test.after` runs once after all tests in this file are complete
test.after(async () => {
    console.log('\n--- Global Test Teardown: Disconnecting Mongoose and stopping MongoMemoryServer ---');
    await mongoose.disconnect();
    if(mongoServer) {
        await mongoServer.stop()
    }
    console.log('--- Global Test Teardown Complete ---');
});



// --- Test Suite: Auth API ---
// Using `test` as a container for related tests (like describe from other frameworks)
test('Auth API Endpoints', async (t) => {

    //---Nested Test Suite: POST /api/auth/signup ---
    await t.test('POST /api/auth/signup', async(t) => {

        await t.test('should register a new user successfully (201 Created)', async () => {
            const res = request(app) // Use supertest with the imported Express app
              .post('/api/auth/signup')
              .send({
                username: 'testuser_signup_ok',
                password: 'SecureP@ssword123!'
              });

            //Assertions
            assert.strictEqual((await res).status, 201, `Expected status code 201 for successful signup, but got ${(await res).statusCode}. Response: ${JSON.stringify((await res).body)}`);
            assert.ok((await res).body.token, 'Response body shoudl contain a token');
            assert.ok((await res).body.userId, 'Response body should contain a userId');
            assert.strictEqual((await res).body.username, 'testuser_signup_ok', 'Response username should match the sent username');

            //Optionally verify user in database
            const userInDb = await User.findById((await res).body.userId);
            assert.ok(userInDb, 'User should be found in the database');
            assert.strictEqual(userInDb?.username, 'testuser_signup_ok','Username in DB should match');
        });

        await t.test('should return 400 for existing username', async() => {
            //first register a user successfully
            await request(app)
                .post('/api/auth/signup')
                .send({ username: 'existinguser_test', password: 'Password123!' });

            //Then attempt to register with the same username
            const res = await request(app)
                .post('/api/auth/signup')
                .send({ username: 'existinguser_test', password: 'AnotherP@ssword1!' });
            assert.strictEqual(res.statusCode, 400, `Expected status 400 for duplicate user, but got ${res.statusCode}. Response: ${JSON.stringify(res.body)} `);
            assert.strictEqual(res.body.message, 'Username already exists', 'Error message should indicate duplicate username');
        });
        
        
        await t.test('should return 400 for invalid password (too short)', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send({ username: 'shortpassuser', password: 'short' }) //invalid password
            
                assert.strictEqual(res.statusCode, 400, `Expected status 400 for invalid password, but got ${res.statusCode}. Response: ${JSON.stringify(res.body)}`);
                assert.ok(res.body.errors, 'Response body should contain validation errors');
                assert.ok(res.body.errors.some((e: any) => e.msg.includes('Password must be at least 6 characters long.')), 'Error message should indicate password length validation');
        });
    });


    // --- Nested Test Suite: POST /api/auth/login ---
    await t.test('POST /api/auth/login', async (t) => {
        let testUsername = 'loginuser_ok';
        let testPassword = 'LoginP@ssword1!';
        let hashedPassword = '';

        // `beforeEach` for this nested suite to prepare user for login tests
        t.beforeEach(async () => {
            await User.deleteMany();
            hashedPassword = await bcrypt.hash(testPassword, 12);
            const userForLogin = new User({ username: testUsername, password: hashedPassword });
            await userForLogin.save()
        });

        await t.test('should log in an existing user successfully (200 OK)', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    username: testUsername,
                    password: testPassword
                });

            assert.strictEqual(res.statusCode, 200, `Expected status 200 for successful login, but got ${res.statusCode}. Response: ${JSON.stringify(res.body)}`);
            assert.ok(res.body.token, 'Response body should contain a token');
            assert.ok(res.body.userId, 'Response body should contain a userId');
            assert.strictEqual(res.body.username, testUsername, 'Response username should match');
        });


        await t.test('should return 400 for invalid credentials (wrong password)', async() => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    username: testUsername,
                    password: 'WrongPassword!'
                });
            
            assert.strictEqual(res.statusCode, 400, `Expected status 400 for wrong password, but got ${res.statusCode}. Response: ${JSON.stringify(res.body)}`);
            assert.strictEqual(res.body.message, 'Invalid credentials', 'Error message should indicate invalid credentials');
        });

        await t.test('should return 400 for invalid credentials (user not found)', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'nonexistentuser',
                    password: 'AnyP@ssword123!'
                });

            assert.strictEqual(res.statusCode, 400, `Expected status 400 for user not found, but got ${res.statusCode}. Response: ${JSON.stringify(res.body)}`);
            assert.strictEqual(res.body.message, 'Invalid credentials.', 'Error message should indicate invalid credentials');
        });
    })
})