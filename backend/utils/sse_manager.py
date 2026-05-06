import asyncio
from fastapi import Request
from typing import Dict, List

class SSEManager:
    def __init__(self):
        self.active_connections: Dict[str, List[asyncio.Queue]] = {}

    async def susbcribe(self, analysis_id: str, request: Request):
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
                await asyncio.sleep(0.1)  # Keep the connection alive
                data = await queue.get()
                yield f"data: {data}\n\n"
        except asyncio.CancelledError:
            print(f"SSE connection cancelled: {analysis_id}")
        finally:
            print(f"Cleaning up SSE connection: {analysis_id}")
            if analysis_id in self.active_connections:
                del self.active_connections[analysis_id]

    async def disconnect(self, queue: asyncio.Queue):
        self.clients.remove(queue)

    async def send_event(self, analysis_id: str, event_name: str, percentage: int, status: str = "in_progress"):
        if analysis_id in self.active_connections:
            import json
            payload = json.dumps({
                "analysis_id" : analysis_id,
                "event": event_name,
                "percentage": percentage,
                "status": status
            })
            await self.active_connections[analysis_id].put(payload)
