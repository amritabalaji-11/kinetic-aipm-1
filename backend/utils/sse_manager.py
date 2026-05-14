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

                if parsed.get("status") in [
                    "completed",
                    "failed"
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
        status: str = "in_progress"
    ):

        payload = json.dumps({
            "analysis_id": analysis_id,
            "event": event_name,
            "percentage": percentage,
            "status": status
        })

        self.latest_event[analysis_id] = payload

        if analysis_id not in self.active_connections:
            return

        for queue in self.active_connections[analysis_id]:
            await queue.put(payload)


# singleton
sse_manager = SSEManager()