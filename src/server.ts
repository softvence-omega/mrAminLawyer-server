import mongoose from "mongoose";
import app from "./app";
import { Server } from "http";
import config from "./config";
import adminSeeder from "./seeder/adminSeeder";
import startCourtReminderCron from "./util/coateReminderCorn";
import { setupWebSocket } from './util/webSocket';


let server: Server;
startCourtReminderCron()

async function main() {
  try {
    console.log("connecting to mongodb....⏳");
    await mongoose.connect(config.mongoose_uri);
    await adminSeeder()
    server = app.listen(config.port, () => {
      console.log(`Mr. Amin Lawyer server app listening on port ${config.port}`);
    });

    // Setup WebSocket after server is ready
    const { wss, onlineUsers } = setupWebSocket(server, config.jwt_token_secret);
    app.set('wss', wss);
    app.set('onlineUsers', onlineUsers)
  } 
  catch (err : any) {
    throw Error('something went wrong in server or mongoose connection');
  }
}
main();

// Global unhandled promise rejection handler
process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Gracefully shutting down the server
  if (server) {
    try {
      server.close(() => {
        console.log(
          'Server and MongoDB connection closed due to unhandled rejection.',
        );
        process.exit(1); // Exit the process with an error code
      });
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1); // Exit with error code if shutting down fails
    }
  } else {
    process.exit(1);
  }
});

// Global uncaught exception handler
process.on('uncaughtException', async (err) => {
  console.error('Uncaught Exception:', err);
  // Gracefully shutting down the server
  if (server) {
    try {
      server.close(() => {
        console.log(
          'Server and MongoDB connection closed due to uncaught exception.',
        );
        process.exit(1); // Exit the process with an error code
      });
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1); // Exit with error code if shutting down fails
    }
  } else {
    process.exit(1);
  }
});
