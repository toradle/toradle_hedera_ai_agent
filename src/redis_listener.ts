import * as dotenv from "dotenv";

import {
  subscribeToChannel,
  connectRedis,
  checkRedisHealth,
} from "./redis-client";

import {
  initializeAgent,
  validateEnvironment,
} from "./utils";

import { askAIChat } from "./ask_ai_chat";

dotenv.config();

validateEnvironment();

async function main() {
  try {
    await connectRedis();
    const isRedisHealthy = await checkRedisHealth();

    console.log("Starting Hedera AI Agent Redis Listener ...");
    const { agent, config } = await initializeAgent();

    if (isRedisHealthy) {
      subscribeToChannel(async (message) => {
        console.log("Received message:", message);
        await askAIChat(agent, config, message);
      });
    } else {
      console.error("Redis is not healthy. Exiting...");
      process.exit(1);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}