"""
app/utils/limiter.py
----------------------
Shared rate-limiter instance (slowapi — free/open-source, in-memory by
default). Kept in its own module so both main.py (to register it on the
app) and api/auth.py (to decorate routes) can import the same instance
without a circular import.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
