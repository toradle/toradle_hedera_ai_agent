import { HederaAgentKit } from "./agent";
import { ServerSigner } from './signer/server-signer';
import { createHederaTools } from ".";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage } from "@langchain/core/messages";

export const sendPrompt = async (
    agent: any,
    config: any,
    userInput: string,
    isCustodial: boolean
) => {
  return agent.stream(
      { messages: [new HumanMessage(userInput)] },
      {...config, configurable: {...config.configurable, isCustodial: isCustodial}}
  );
};

export const validateEnvironment = (): void =>  {
  const missingVars: string[] = [];
  // You can tweak these as needed
  const requiredVars = ["OPENAI_API_KEY", "HEDERA_ACCOUNT_ID"];

  requiredVars.forEach((varName) => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.error("Error: Required environment variables are not set");
    missingVars.forEach((varName) => {
      console.error(`${varName}=your_${varName.toLowerCase()}_here`);
    });
    process.exit(1);
  }
};


export const initializeAgent = async () => {
  try {
    const llm = new ChatOpenAI({
      modelName: "o3-mini",
      configuration: {
        baseURL: process.env.OPENAI_API_BASE_URL,
      }
    });

    const hgraphConfig = {
      customUrl: 'https://mainnet.hedera.api.hgraph.dev/v1/<API-KEY>',
      apiKey: 'your-hgraph-api-key-here'
    };

    // Initialize signer
    const signer = new ServerSigner(
      process.env.HEDERA_ACCOUNT_ID!,
      process.env.HEDERA_PRIVATE_KEY!,
      process.env.HEDERA_NETWORK_TYPE as "mainnet" | "testnet"
    );

    // Initialize HederaAgentKit
    const hederaKit = new HederaAgentKit(
      signer,
      undefined, // pluginConfig
      'provideBytes', // operationalMode
      undefined, // userAccountId
      true, // scheduleUserTransactionsInBytesMode
      undefined, // modelCapability
      undefined, // modelName
      hgraphConfig // mirrorNodeConfig
    );

    // Create the LangChain-compatible tools
    const tools = await createHederaTools(hederaKit);

    // Prepare an in-memory checkpoint saver
    const memory = new MemorySaver();

    // Additional configuration for the agent
    const config = { configurable: { thread_id: "Hedera Agent Kit!", isCustodial: true } };

    // Create the React agent
    const agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: memory,
      // You can adjust this message for your scenario:
      messageModifier: `
        **General Guidelines**
        You are a helpful agent that can interact on-chain using the Hedera Agent Kit. 
        You are empowered to interact on-chain using your tools. If you ever need funds,
        you can request them from a faucet or from the user. 
        If there is a 5XX (internal) HTTP error code, ask the user to try again later. 
        If someone asks you to do something you can't do with your available tools, you 
        must say so, and encourage them to implement it themselves with the Hedera Agent Kit. 
        Keep your responses concise and helpful.
        
        **Token Creation Rules**:
        If the user mentions **NFT**, **non-fungible token**, or **unique token**, always use the **hedera_create_non_fungible_token** tool.
        If the user mentions **fungible token**, **FT**, or **decimal-based token**, always use the **hedera_create_fungible_token** tool.
        
      `,
    });

    return { agent, config };
  } catch (error) {
    console.error("Failed to initialize agent:", error);
    throw error;
  }
};