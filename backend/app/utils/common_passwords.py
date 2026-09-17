"""
app/utils/common_passwords.py
-------------------------------
A small, local blocklist of the most-leaked passwords worldwide
(per recurring breach-corpus analyses). No API calls, no external
service — just a flat set checked at registration time.

This isn't meant to be exhaustive; it's a cheap filter that blocks the
passwords an attacker tries first.
"""

COMMON_PASSWORDS = {
    "12345678", "123456789", "1234567890", "password", "password1",
    "password123", "qwerty123", "qwertyuiop", "letmein", "welcome",
    "welcome1", "monkey123", "dragon123", "sunshine", "iloveyou",
    "trustno1", "princess", "football", "baseball", "superman",
    "123123123", "abc123456", "qazwsxedc", "1q2w3e4r5t", "1qaz2wsx",
    "admin123", "administrator", "letmein123", "changeme", "passw0rd",
    "p@ssw0rd", "p@ssword", "abcd1234", "987654321", "11111111",
    "00000000", "aaaaaaaa", "zxcvbnm1", "asdfghjk", "computer1",
    "internet", "whatever", "starwars1", "freedom1", "master123",
}


def is_common_password(password: str) -> bool:
    return password.lower() in COMMON_PASSWORDS
