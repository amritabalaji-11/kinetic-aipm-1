import asyncio
import json
from fastapi import Request


class SSEManager:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(SSEManager, cls).__new__(cls, *args, **kwargs)
            cls._instance.active_connections = {}
        return cls._instance

    def __init__(self):
        pass

    async def subscribe(self, analysis_id: str, request: Request):
        if analysis_id not in self.active_connections:
            self.active_connections[analysis_id] = []
        queue = asyncio.Queue()
        self.active_connections[analysis_id].append(queue)
        print(f"Client subscribed to SSE: {analysis_id}")

        try:
            while True:
                if await request.is_disconnected():
                    print(f"Client disconnected from SSE: {analysis_id}")
                    break
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=0.5)
                    yield f"data: {data}\n\n"
                except asyncio.TimeoutError:
                    continue
        except asyncio.CancelledError:
            print(f"SSE connection cancelled: {analysis_id}")
        finally:
            print(f"Cleaning up SSE connection: {analysis_id}")
            if analysis_id in self.active_connections:
                try:
                    self.active_connections[analysis_id].remove(queue)
                except ValueError:
                    pass
                if not self.active_connections[analysis_id]:
                    del self.active_connections[analysis_id]

    async def send_event(self, analysis_id: str, event_name: str, percentage: int, status: str = "in_progress", **kwargs):
        if analysis_id in self.active_connections:
            payload_dict = {
                "analysis_id": analysis_id,
                "event": event_name,
                "percentage": percentage,
                "status": status
            }
            payload_dict.update(kwargs)
            payload = json.dumps(payload_dict)
            for queue in self.active_connections[analysis_id]:
                await queue.put(payload)
