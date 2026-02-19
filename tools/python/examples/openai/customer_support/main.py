import env
import asyncio
from emailer import Emailer, Email
from typing import Union, List
import support_agent
import markdown as markdown
import json

from agents import (
    ItemHelpers,
    TResponseInputItem,
)


env.ensure("STRIPE_SECRET_KEY")
env.ensure("OPENAI_API_KEY")

email_address = env.ensure("EMAIL_ADDRESS")
support_address = env.get_or("SUPPORT_ADDRESS", email_address)
email_password = env.ensure("EMAIL_PASSWORD")
emailer = Emailer(email_address, email_password, support_address)


def unsure(str: str) -> bool:
    return (
        "not sure" in str
        or "unsure" in str
        or "don't know" in str
        or "dont know" in str
        or "do not know" in str
    )


async def respond(thread: List[Email]) -> Union[Email, None]:
    most_recent = thread[-1]
    print(f"Got unread email:\n  {json.dumps(most_recent.to_dict())}")

    # Loop through the entire thread to add historical context for the agent
    input_items: list[TResponseInputItem] = []
    for email in thread:
        input_items.append(
            {
                "content": (
                    "This is an earlier email:"
                    f"Email from: {email.from_address}\n"
                    f"To: {email.to_address}\n"
                    f"Subject: {email.subject}\n\n"
                    f"{email.body}"
                ),
                "role": "user",
            }
        )

    input_items.append(
        {
            "content": (
                "This the latest email"
                "You can use context from earlier emails"
                "but reply specifically to the following email:"
                f"Email from: {most_recent.from_address}\n"
                f"To: {most_recent.to_address}\n"
                f"Subject: {most_recent.subject}\n\n"
                f"{most_recent.body}"
            ),
            "role": "user",
        }
    )

    print(f"Sending to agent:\n  {json.dumps(input_items)}")

    output = await support_agent.run(input_items)
    body_md = ItemHelpers.text_message_outputs(output.new_items)

    # Handle answers that the agent doesn't know
    if unsure(body_md.lower()):
        print(
            f"Agent doesn't know, ignore response and keep email in the inbox:\n{body_md}"
        )
        return None

    # OpenAI often returns the body in html fences, trim those
    body_html = markdown.markdown(body_md, extensions=["tables"])

    return Email(
        from_address=most_recent.to_address,
        to_address=most_recent.from_address,
        subject=most_recent.subject,
        body=body_html,
    )


async def main():
    await support_agent.init()

    try:
        await emailer.run(respond, delay=30, mark_read=True)
    finally:
        await support_agent.close()


if __name__ == "__main__":
    asyncio.run(main())
