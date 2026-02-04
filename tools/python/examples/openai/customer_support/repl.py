import asyncio

from agents import ItemHelpers, TResponseInputItem

import support_agent


async def main():
    """Simple REPL for testing your support agent"""
    await support_agent.init()

    try:
        input_items: list[TResponseInputItem] = []
        while True:
            user_input = input("Enter your message: ")
            input_items.append({"content": user_input, "role": "user"})
            result = await support_agent.run(input_items)
            output = ItemHelpers.text_message_outputs(result.new_items)
            print(f"Assistant: {output}")
            input_items = result.to_input_list()
    finally:
        await support_agent.close()


if __name__ == "__main__":
    asyncio.run(main())
