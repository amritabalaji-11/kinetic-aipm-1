# Kinetic Backend Architecture

## API Routing Overview

The system uses two different routing paths depending on workload type:

### REST APIs (via API Gateway)
- /upload
- /analyze
- /auth/*

Flow:
Client → API Gateway → Cloud Run → Python API

---

### SSE (Server-Sent Events) Streams (bypass API Gateway)

- /stream
- /events (future real-time endpoints)

Flow:
Client → HTTPS Load Balancer → Cloud Run

### Reason for bypass:
API Gateway buffers responses and does not support streaming connections properly.
This breaks SSE behavior (delays, buffering, connection termination issues).

Therefore SSE endpoints are routed directly to Cloud Run using a Load Balancer.