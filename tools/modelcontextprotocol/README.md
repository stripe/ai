# Stripe Model Context Protocol

The Stripe [Model Context Protocol](https://modelcontextprotocol.com/) server allows you to integrate with Stripe APIs through function calling. This protocol supports various tools to interact with different Stripe services.

## Setup

Stripe hosts a remote MCP server at https://mcp.stripe.com. View the docs [here](https://docs.stripe.com/mcp).

## Local

To run the Stripe MCP server locally using npx, use the following command:

```bash
# To set up all available tools
npx -y @stripe/mcp --tools=all --api-key=YOUR_STRIPE_SECRET_KEY

# To set up specific tools
npx -y @stripe/mcp --tools=customers.create,customers.read,products.create --api-key=YOUR_STRIPE_SECRET_KEY

# To configure a Stripe connected account
npx -y @stripe/mcp --tools=all --api-key=YOUR_STRIPE_SECRET_KEY --stripe-account=CONNECTED_ACCOUNT_ID
```

Make sure to replace `YOUR_STRIPE_SECRET_KEY` with your actual Stripe secret key. Alternatively, you could set the STRIPE_SECRET_KEY in your environment variables.

### Usage with Claude Desktop

Add the following to your `claude_desktop_config.json`. See [here](https://modelcontextprotocol.io/quickstart/user) for more details.

```
{
  "mcpServers": {
    "stripe": {
      "command": "npx",
      "args": [
          "-y",
          "@stripe/mcp",
          "--tools=all",
          "--api-key=STRIPE_SECRET_KEY"
      ]
    }
  }
}
```

of if you're using Docker

```
{
    “mcpServers”: {
        “stripe”: {
            “command”: “docker",
            “args”: [
                “run”,
                "--rm",
                "-i",
                “mcp/stripe”,
                “--tools=all”,
                “--api-key=STRIPE_SECRET_KEY”
            ]
        }
    }
}

```

### Usage with Gemini CLI

1. Install [Gemini CLI](https://google-gemini.github.io/gemini-cli/#-installation) through your preferred method.
2. Install the Stripe MCP extension: `gemini extensions install https://github.com/stripe/ai`.
3. Start Gemini CLI: `gemini`.
4. Go through the OAUTH flow: `/mcp auth stripe`.

### Usage with GitHub Copilot CLI

You can add an MCP server interactively with `/mcp add`, or edit `~/.copilot/mcp-config.json` directly. See [here](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli#add-an-mcp-server).

```
{
  "mcpServers": {
    "stripe": {
      "type": "local",
      "command": "npx",
      "args": [
        "-y",
        "@stripe/mcp",
        "--tools=all",
        "--api-key=STRIPE_SECRET_KEY"
      ]
    }
  }
}
```

## Available tools

See the [Stripe MCP documentation](https://docs.stripe.com/mcp#tools) for a list of tools.

## Debugging the Server

To debug your server, you can use the [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector).

First build the server

```
npm run build
```

Run the following command in your terminal:

```bash
# Start MCP Inspector and server with all tools
npx @modelcontextprotocol/inspector node dist/index.js --tools=all --api-key=YOUR_STRIPE_SECRET_KEY
```

### Build using Docker

First build the server

```
docker build -t mcp/stripe .
```

Run the following command in your terminal:

```bash
docker run -p 3000:3000 -p 5173:5173 -v /var/run/docker.sock:/var/run/docker.sock mcp/inspector docker run --rm -i mcp/stripe --tools=all --api-key=YOUR_STRIPE_SECRET_KEY

```

### Instructions

1. Replace `YOUR_STRIPE_SECRET_KEY` with your actual Stripe API secret key.
2. Run the command to start the MCP Inspector.
3. Open the MCP Inspector UI in your browser and click Connect to start the MCP server.
4. You can see the list of tools you selected and test each tool individually.
