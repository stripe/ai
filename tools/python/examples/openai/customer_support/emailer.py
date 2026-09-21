# pyright: strict

import imaplib
import email
import smtplib
from email.mime.text import MIMEText
from email.message import Message
from email.mime.multipart import MIMEMultipart
from email.utils import parseaddr
from typing import List, Tuple, Callable, Union, Awaitable
import asyncio
import json
import re
from datetime import datetime
from email.utils import parsedate_to_datetime


class Email:
    def __init__(
        self,
        from_address: str,
        to_address: str,
        subject: str,
        body: str,
        id: str = "",
        date: datetime = datetime.now(),
    ):
        self.id = id
        self.to_address = to_address
        self.from_address = from_address
        self.subject = subject
        self.body = body
        self.date = date

    def to_message(self, reply_id: str, reply_to: str) -> MIMEMultipart:
        msg = MIMEMultipart()
        msg["From"] = self.from_address
        msg["To"] = self.to_address
        msg["Subject"] = self.subject
        msg["In-Reply-To"] = reply_id
        msg["References"] = reply_id
        msg["Reply-To"] = reply_to
        msg["Bcc"] = self.from_address
        msg.attach(MIMEText(f"<html><body>{self.body}</body></html>", "html"))
        return msg

    def to_dict(self):
        return {
            "id": self.id,
            "to": self.to_address,
            "from": self.from_address,
            "subject": self.subject,
            "body": self.body,
            "date": self.date.strftime("%a, %d %b %Y %H:%M:%S %z"),
        }


class Emailer:
    """
    Emailer is an IMAP/SMTP client that can be used to fetch and respond to emails.
    It was mostly vibe-coded so please make improvements!
    """

    def __init__(
        self,
        email_address: str,
        email_password: str,
        support_address: str = "",
        imap_server: str = "imap.gmail.com",
        imap_port: int = 993,
        smtp_server: str = "smtp.gmail.com",
        smtp_port: int = 587,
    ):
        # Email configuration
        self.email_address = email_address
        self.support_address = (
            support_address if support_address else email_address
        )
        self.email_password = email_password
        self.imap_server = imap_server
        self.imap_port = imap_port
        self.smtp_server = smtp_server
        self.smtp_port = smtp_port

    def _connect_to_email(self) -> Tuple[imaplib.IMAP4_SSL, smtplib.SMTP]:
        """Establish connections to email servers."""
        # Connect to IMAP server
        imap_conn = imaplib.IMAP4_SSL(self.imap_server, self.imap_port)
        imap_conn.login(self.email_address, self.email_password)

        # Connect to SMTP server
        smtp_conn = smtplib.SMTP(self.smtp_server, self.smtp_port)
        smtp_conn.starttls()
        smtp_conn.login(self.email_address, self.email_password)

        return imap_conn, smtp_conn

    def _get_body(self, email_message: Message) -> str:
        body: str = ""
        if email_message.is_multipart():
            for part in email_message.walk():
                if part.get_content_type() == "text/plain":
                    payload = part.get_payload(decode=True)
                    if isinstance(payload, bytes):
                        body = payload.decode()
                    break
        else:
            payload = email_message.get_payload(decode=True)
            if isinstance(payload, bytes):
                body = payload.decode()
            else:
                body = str(payload)
        return self._strip_replies(body)

    def _strip_replies(self, raw_body: str) -> str:
        lines = raw_body.split("\n")
        pruned: List[str] = []
        for line in lines:
            # Stop if we see a typical reply indicator
            if line.strip().startswith("On ") and " wrote:" in line:
                break
            pruned.append(line)
        return "\n".join(pruned).strip()

    def _parse_email(
        self, imap_conn: imaplib.IMAP4_SSL, email_id: bytes
    ) -> Union[Email, None]:
        _, msg_data = imap_conn.fetch(email_id.decode(), "(BODY.PEEK[])")
        if not msg_data or not msg_data[0]:
            return None
        msg_resp = msg_data[0]
        if isinstance(msg_resp, tuple) and len(msg_resp) == 2:
            email_body = msg_resp[1]
        else:
            return None

        email_message = email.message_from_bytes(email_body)
        subject = email_message["subject"] or ""
        from_address = parseaddr(email_message.get("From", ""))[1]
        to_address = parseaddr(email_message.get("To", ""))[1]
        date_str = email_message.get("Date", "")
        date = datetime.now()
        if date_str:
            try:
                date = parsedate_to_datetime(date_str)
            except Exception:
                pass

        body = self._get_body(email_message)
        return Email(
            id=email_id.decode(),
            from_address=from_address,
            to_address=to_address,
            subject=subject,
            body=body,
            date=date,
        )

    def _get_email_thread(
        self, imap_conn: imaplib.IMAP4_SSL, email_id_bytes: bytes
    ) -> List[Email]:
        email = self._parse_email(imap_conn, email_id_bytes)
        if not email:
            return []

        thread = [email]

        # Try thread via X-GM-THRID (Gmail extension)
        _, thrid_data = imap_conn.fetch(email.id, "(X-GM-THRID)")
        match = None
        if thrid_data and thrid_data[0]:
            data = thrid_data[0]
            if isinstance(data, bytes):
                match = re.search(r"X-GM-THRID\s+(\d+)", data.decode())
            else:
                match = re.search(r"X-GM-THRID\s+(\d+)", str(data))
        if match:
            thread_id = match.group(1)
            _, thread_ids = imap_conn.search(None, f"X-GM-THRID {thread_id}")
            if thread_ids and thread_ids[0]:
                thread = [
                    self._parse_email(imap_conn, mid)
                    for mid in thread_ids[0].split()
                ]
                thread = [e for e in thread if e]
                thread.sort(key=lambda e: e.date)
                return thread

        # Fallback: use REFERENCES header
        _, ref_data = imap_conn.fetch(
            email.id, "(BODY.PEEK[HEADER.FIELDS (REFERENCES)])"
        )
        if ref_data and ref_data[0]:
            ref_line = (
                ref_data[0][1].decode()
                if isinstance(ref_data[0][1], bytes)
                else ""
            )
            refs = re.findall(r"<([^>]+)>", ref_line)
            for ref in refs:
                _, ref_ids = imap_conn.search(
                    None, f'(HEADER Message-ID "<{ref}>")'
                )
                if ref_ids and ref_ids[0]:
                    for ref_id in ref_ids[0].split():
                        ref_email = self._parse_email(imap_conn, ref_id)
                        if ref_email and ref_email.id not in [
                            e.id for e in thread
                        ]:
                            thread.append(ref_email)

            # Sort emails in the thread by date (ascending order)
            thread.sort(key=lambda e: e.date)
            return thread

        return thread

    def _get_unread_emails(
        self, imap_conn: imaplib.IMAP4_SSL
    ) -> List[List[Email]]:
        imap_conn.select("INBOX")
        _, msg_nums = imap_conn.search(
            None, f'(UNSEEN TO "{self.support_address}")'
        )
        emails: List[List[Email]] = []

        for email_id in msg_nums[0].split():
            thread = self._get_email_thread(imap_conn, email_id)
            if not thread:
                continue

            most_recent = thread[-1]
            if most_recent.from_address == self.support_address:
                # Agent's own reply (e.g. BCC'd), mark as read so it stops showing up as unseen
                self.mark_as_read(imap_conn, email_id.decode())
                continue

            emails.append(thread)

        return emails

    def mark_as_read(self, imap_conn: imaplib.IMAP4_SSL, message_id: str):
        imap_conn.store(message_id, "+FLAGS", "\\Seen")

    def get_email_thread(self, email_id: str) -> List[Email]:
        # Connect to email servers
        imap_conn, smtp_conn = self._connect_to_email()
        imap_conn.select("INBOX")

        # Get the thread
        thread = self._get_email_thread(
            imap_conn=imap_conn, email_id_bytes=email_id.encode()
        )

        # Close connections
        imap_conn.logout()
        smtp_conn.quit()

        return thread

    async def process(
        self,
        respond: Callable[[List[Email]], Awaitable[Union[Email, None]]],
        mark_read: bool = True,
    ):
        # Connect to email servers
        imap_conn, smtp_conn = self._connect_to_email()

        # Get unread emails
        print("Fetching unread emails...")
        unread_emails = self._get_unread_emails(imap_conn)
        for email_thread in unread_emails:
            # Get the most recent email in the thread
            most_recent = email_thread[-1]

            # Generate the response
            response = await respond(email_thread)

            # If there is no response, skip this email and keep as unread
            # in the inbox
            if response is None:
                continue

            # Send the response
            # Get the most recent email in the thread to reply to
            print(
                f"Replying to '{response.to_address}' with:\n  {json.dumps(response.body)}"
            )
            smtp_conn.send_message(
                response.to_message(most_recent.id, self.support_address)
            )

            # Mark the original email as read
            if mark_read:
                self.mark_as_read(imap_conn, most_recent.id)

        # Close connections
        imap_conn.logout()
        smtp_conn.quit()

    async def run(
        self,
        respond: Callable[[List[Email]], Awaitable[Union[Email, None]]],
        mark_read: bool = True,
        delay: int = 60,
    ):
        while True:
            # Process emails
            await self.process(respond, mark_read)
            # Wait before next check
            print(f"Sleeping for {delay}s...")
            await asyncio.sleep(delay)
