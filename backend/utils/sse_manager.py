# backend/utils/sse_manager.py

import asyncio
import json
from typing import Dict, List


class SSEManager:

    def __init__(self):

        self.active_connections: Dict[str, List[asyncio.Queue]] = {}

        self.latest_event: Dict[str, str] = {}

    async def subscribe(self, analysis_id: str, request):

        if analysis_id not in self.active_connections:
            self.active_connections[analysis_id] = []

        queue = asyncio.Queue()

        self.active_connections[analysis_id].append(queue)

        print(f"[SSE] Client subscribed: {analysis_id}")

        try:

            # reconnect safety
            if analysis_id in self.latest_event:
                await queue.put(self.latest_event[analysis_id])

            while True:

                # cliente desconectado
                if await request.is_disconnected():
                    break

                data = await queue.get()

                # enviar evento SSE
                yield f"data: {data}\n\n"

                # -----------------------------------
                # close stream when pipeline finishes (success or failure)
                # -----------------------------------

                parsed = json.loads(data)

                # consider 'complete' and 'failed'/'error' as terminal statuses
                if parsed.get("status") in [
                    "completed",
                    "complete",
                    "failed",
                    "error"
                ]:

                    print(
                        f"[SSE] Stream finished: {analysis_id}"
                    )

                    break

        finally:

            print(f"[SSE] Cleaning up: {analysis_id}")

            if analysis_id in self.active_connections:

                if queue in self.active_connections[analysis_id]:
                    self.active_connections[analysis_id].remove(queue)

                if not self.active_connections[analysis_id]:
                    del self.active_connections[analysis_id]

    async def send_event(
        self,
        analysis_id: str,
        event_name: str,
        percentage: int,
        status: str = "in_progress",
        result: dict = None
    ):

        payload_obj = {
            "analysis_id": analysis_id,
            "event": event_name,
            "percentage": percentage,
            "status": status
        }

        if result is not None:
            payload_obj["result"] = result

        payload = json.dumps(payload_obj)

        print(f"[SSE] Sending event: {event_name} for {analysis_id}")

        self.latest_event[analysis_id] = payload

        if analysis_id not in self.active_connections:
            print(f"[SSE] No active connections for {analysis_id}")
            return

        print(f"[SSE] Broadcasting to {len(self.active_connections[analysis_id])} clients")

        for queue in self.active_connections[analysis_id]:
            await queue.put(payload)


# singleton
sse_manager = SSEManager()