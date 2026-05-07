import asyncio
import json
from typing import Dict, List

class SSEManager:
    def __init__(self):
        self.active_connections: Dict[str, List[asyncio.Queue]] = {}
        self.latest_event: Dict[str, str] = {}  # helps with reconnect safety

    async def subscribe(self, analysis_id: str, request):
        if analysis_id not in self.active_connections:
            self.active_connections[analysis_id] = []

        queue = asyncio.Queue()
        self.active_connections[analysis_id].append(queue)

        print(f"[SSE] Client subscribed: {analysis_id}")

        try:
            # send last known event immediately (reconnect safety)
            if analysis_id in self.latest_event:
                await queue.put(self.latest_event[analysis_id])

            while True:
                if await request.is_disconnected():
                    break

                data = await queue.get()
                yield f"data: {data}\n\n"

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

        # store last event for reconnects
        self.latest_event[analysis_id] = payload

        if analysis_id not in self.active_connections:
            return

        for queue in self.active_connections[analysis_id]:
            await queue.put(payload)


#  SINGLETON 
sse_manager = SSEManager()