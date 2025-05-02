import {
  sendPrompt
} from "./utils";

import {
  publishToRespChannel
} from "./redis-client";

export const askAIChat = async (agent: any, config: any, userInput: string) => {
  console.log("Asking hedera AI chat ...");

  try {
      // for now, isCustodial is based on env, but later it can be changed and passed with a prompt text coming from FE
      const isCustodial = process.env.CUSTODIAL_MODE === "true";
      const stream = await sendPrompt(agent, config, userInput, isCustodial);
      const messages: any[] = []
      for await (const chunk of stream) {
        if ("agent" in chunk) {
          messages.push(chunk.agent.messages[0].content);
        } else if ("tools" in chunk) {
          messages.push(chunk.tools.messages[0].content);
        }
        messages.push("-------------------");
      }
      publishToRespChannel(messages.join("\n"));
  } catch (error) {
    if (error instanceof Error) {
      const msg = "Error:" + error.message;
      publishToRespChannel(msg);
    }
  }
};