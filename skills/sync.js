const fs = require("fs").promises;
const path = require("path");

const STRIPE_API_KEY = process.env.MCP_STRIPE_API_KEY;

if (!STRIPE_API_KEY) {
  throw new Error("MCP_STRIPE_API_KEY environment variable is required");
}

const getMCPPrompt = async (promptName) => {
  const response = await fetch("https://mcp.stripe.com", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${STRIPE_API_KEY}`,
      "User-Agent": "github.com/stripe/ai/skills",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "prompts/get",
      params: {
        name: promptName,
        arguments: {},
      },
      id: 1,
    }),
  });
  const data = await response.json();
  return data.result.messages[0].content.text;
};

const listMCPPrompts = async () => {
  const response = await fetch("https://mcp.stripe.com", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${STRIPE_API_KEY}`,
      "User-Agent": "github.com/stripe/ai/skills",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "prompts/list",
      params: {},
      id: 1,
    }),
  });
  const data = await response.json();
  return data.result.prompts;
};

const run = async () => {
  const prompts = await listMCPPrompts();
  console.log(`Found ${prompts.length} prompts`);

  // Define all locations where skills should be written
  const outputLocations = [
    __dirname, // skills/ (source of truth)
    path.join(__dirname, "../providers/claude/plugin/skills"),
    path.join(__dirname, "../providers/cursor/plugin/skills"),
  ];

  for (const prompt of prompts) {
    const content = await getMCPPrompt(prompt.name);

    const skillFileContent = `---
description: ${prompt.description}
alwaysApply: false
---

${content}
`;

    // Write to all locations
    for (const location of outputLocations) {
      const outputDir = path.join(location, prompt.name);
      const outputPath = path.join(outputDir, "SKILL.md");

      // Ensure directory exists
      await fs.mkdir(outputDir, { recursive: true });

      await fs.writeFile(outputPath, skillFileContent, "utf8");
      console.log(`Content written to ${outputPath}`);
    }
  }
};

run();
