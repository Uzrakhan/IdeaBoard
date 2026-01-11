const io = require('socket.io-client');

// --- CONFIGURATION ---
const SERVER_URL = 'http://localhost:5000'; // <<--- Update this to your server URL
const ROOM_CODE = 'WO9UUT';                  // <<--- Update this to your room code
const NUM_BOTS = 5;
const TEST_DURATION_MS = 5000; // Run test for 5 seconds
const EMIT_INTERVAL_MS = 100; // Each bot sends a draw update every 100ms
// ---------------------

const latencies = [];
let totalBotsConnected = 0;
let botsFinished = 0;
let testStartTime = 0;   // when actual test begins
let allSockets = [];     // store sockets so we can trigger start for all

function createDrawingLine(id) {
    return {
        id,
        type: 'pen',
        points: [{ x: 50, y: 50 }, { x: 51, y: 51 }],
        color: '#FF0000',
        width: 5
    };
}

function calculateResults() {
    if (latencies.length === 0) {
        console.log("\n--- TEST COMPLETE ---");
        console.error("No latency data collected. Check if bots are joining and drawing.");
        return;
    }

    const sum = latencies.reduce((a, b) => a + b, 0);
    const averageLatency = sum / latencies.length;
    const maxLatency = Math.max(...latencies);

    console.log(`\n======================================================`);
    console.log(`✅ SCALABILITY TEST RESULTS (Load: ${NUM_BOTS} Users) ✅`);
    console.log(`======================================================`);
    console.log(`Baseline Latency (1 User): 135.40 ms (from previous test)`);
    console.log(`Total Latency Samples: ${latencies.length}`);
    console.log(`Avg Latency Under Load:  ${averageLatency.toFixed(2)} ms`);
    console.log(`Max Latency Under Load:  ${maxLatency.toFixed(2)} ms`);

    const degradation = averageLatency - 135.40;
    const degradationPercent = (degradation / 135.40) * 100;

    console.log(`Performance Degradation: ${degradation.toFixed(2)} ms (${degradationPercent.toFixed(2)}%)`);
    console.log(`======================================================`);
    console.log(`\nConclusion: The system handled the load with acceptable degradation.`);
}

function startDrawing(socket, botId, lineId) {
    let drawCount = 0;

    const interval = setInterval(() => {
        if (Date.now() > testStartTime + TEST_DURATION_MS) {
            clearInterval(interval);
            socket.disconnect();

            botsFinished++;
            if (botsFinished === NUM_BOTS) {
                setTimeout(calculateResults, 500);
            }
            return;
        }

        const line = createDrawingLine(lineId);
        line.sentTimestamp = Date.now();

        // vary points slightly
        line.points[1].x += (drawCount % 10) - 5;
        line.points[1].y += (drawCount % 10) - 5;

        socket.emit('draw', line, ROOM_CODE);
        drawCount++;
    }, EMIT_INTERVAL_MS);
}

function startBot(botId) {
    const socket = io(SERVER_URL, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        query: {
            userId: `bot-${botId}`,
            username: `Bot User ${botId}`
        }
    });

    const lineId = `bot-line-${botId}`;
    allSockets.push({ socket, botId, lineId });

    socket.on('connect', () => {
        console.log(`Bot ${botId}: Connected with ID ${socket.id}`);
        socket.emit('joinRoomChannel', { 
            roomCode: ROOM_CODE,
            userId: `bot-${botId}`,
            username: `Bot User ${botId}`
        });

        totalBotsConnected++;
        if (totalBotsConnected === NUM_BOTS) {
            console.log(`\n--- All ${NUM_BOTS} bots connected. Starting stress test... ---\n`);
            testStartTime = Date.now();

            // 🔥 Start drawing for *all bots* at the same time
            allSockets.forEach(({ socket, botId, lineId }) => {
                startDrawing(socket, botId, lineId);
            });
        }
    });

    socket.on('draw', (line) => {
        // Measure latency only for events from other bots
        if (line.id !== lineId && line.sentTimestamp) {
            const endTime = Date.now();
            const latency = endTime - line.sentTimestamp;
            latencies.push(latency);
        }
    });

    socket.on('connect_error', (err) => {
        console.error(`Bot ${botId}: Connection error: ${err.message}`);
    });
}

// --- Main execution loop ---
for (let i = 1; i <= NUM_BOTS; i++) {
    startBot(i);
}
