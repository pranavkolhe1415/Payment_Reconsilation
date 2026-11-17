import mongoose from 'mongoose';

let isConnectedBefore = false;

// Register global connection event listeners
mongoose.connection.on('connected', () => {
  console.log(`[Database] MongoDB successfully connected to: ${mongoose.connection.host}/${mongoose.connection.name}`);
  isConnectedBefore = true;
});

mongoose.connection.on('error', (err) => {
  console.error(`[Database] MongoDB connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  if (isConnectedBefore) {
    console.warn('[Database] MongoDB connection disconnected. Awaiting reconnection...');
  }
});

mongoose.connection.on('reconnected', () => {
  console.log('[Database] MongoDB reconnected successfully.');
});

/**
 * Connect to MongoDB with graceful error recovery and timeout limits.
 * Will not throw uncaught exceptions on failure, ensuring backend availability.
 */
export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/reconx';

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 5000,
      autoIndex: true
    });
    return conn;
  } catch (err) {
    console.warn(`[Database] Graceful Fallback: Unable to establish MongoDB connection (${err.message}). API will operate with in-memory / non-persisted fallback until database is reachable.`);
    return null;
  }
};

/**
 * Disconnect cleanly (for test teardowns and graceful termination).
 */
export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[Database] MongoDB connection closed.');
  }
};

/**
 * Checks whether the MongoDB connection is alive.
 */
export const isDBConnected = () => mongoose.connection.readyState === 1;

/**
 * Detailed database health check diagnostic.
 */
export const getDBStatus = () => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const stateIndex = mongoose.connection.readyState;
  return {
    state: states[stateIndex] || 'unknown',
    connected: stateIndex === 1,
    host: stateIndex === 1 ? mongoose.connection.host : null,
    database: stateIndex === 1 ? mongoose.connection.name : null
  };
};
