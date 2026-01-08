#!/bin/bash
cd "$(dirname "$0")"
exec python -m uvicorn main:app --host 127.0.0.1 --port ${LINKEDIN_SERVICE_PORT:-8001}
