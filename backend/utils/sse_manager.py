# backend/utils/sse_manager.py
#
# This file manages all the live connections between the backend and the frontend.
# When the frontend opens a connection to /analysis/{id}/stream, that connection
# lives here as a "queue" — the pipeline drops events into the queue, and
# this file sends them out over SSE to the browser in real time.

import asyncio
import json
from typing import Dict, List


class SSEManager:

    def __init__(self):
        # Each analysis_id can have multiple browser tabs listening at once.
        # We keep a list of queues — one per connected client.
        self.active_connections: Dict[str, List[asyncio.Queue]] = {}

        # Stores the last event sent for each analysis_id.
        # If the browser reconnects mid-analysis, we replay the last event
        # so it doesn't start from nothing.
        self.latest_event: Dict[str, str] = {}


    async def subscribe(self, analysis_id: str, request):
        # Create a new queue for this client connection
        if analysis_id not in self.active_connections:
            self.active_connections[analysis_id] = []

        queue = asyncio.Queue()
        self.active_connections[analysis_id].append(queue)

        print(f"[SSE] Client subscribed: {analysis_id}")

        try:
            # If the client reconnected and there's already a recent event,
            # send it immediately so the UI isn't blank
            if analysis_id in self.latest_event:
                await queue.put(self.latest_event[analysis_id])

            while True:
                # Stop streaming if the browser tab closed or navigated away
                if await request.is_disconnected():
                    break

                # Wait for the next event from the pipeline
                data = await queue.get()

                # Send it to the browser in SSE format
                yield f"data: {data}\n\n"

                # Check if the pipeline is done (success or failure)
                # If so, close the stream — no more events are coming
                parsed = json.loads(data)
                if parsed.get("status") in ["completed", "failed"]:
                    print(f"[SSE] Stream finished: {analysis_id}")
                    break

        finally:
            # Clean up the queue when this client disconnects
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
        extra: dict = None,
    ):
        # Builds a normal progress event and sends it to all connected clients.
        # Used for all the happy-path steps: upload_received, mediapipe_started, etc.
        payload_dict = {
            "analysis_id": analysis_id,
            "event": event_name,
            "percentage": percentage,
            "status": status,
        }
        if extra:
            payload_dict.update(extra)
        payload = json.dumps(payload_dict)

        print(f"[SSE] Sending event: {event_name} for {analysis_id}")

        self.latest_event[analysis_id] = payload

        if analysis_id not in self.active_connections:
            print(f"[SSE] No active connections for {analysis_id}")
            return

        print(f"[SSE] Broadcasting to {len(self.active_connections[analysis_id])} clients")

        for queue in self.active_connections[analysis_id]:
            await queue.put(payload)


    async def send_error_event(
        self,
        analysis_id: str,
        error_code: str,
        error_stage: str,
        retryable: str,
        message: str,
        landmark_medians: dict = None,
        session_id: str = None,
        user_id: str = None,
    ):
        # Sends a blocking error event — the frontend shows the error screen
        # and stops waiting for more pipeline events.
        #
        # IMPORTANT: retryable must ALWAYS be a string — "true" or "false".
        # The frontend checks:  if (retryable === "true")
        # If we pass a Python boolean False, JavaScript sees it as the string "False"
        # which is truthy — so the wrong button would show. Always pass "true"/"false".
        #
        # error_stage tells the frontend which part of the pipeline failed:
        #   "quality_gate" — bad video (camera angle, occlusion, not enough reps)
        #   "biomechanics"  — computation crashed or video was too short

        payload_dict = {
            "analysis_id": analysis_id,
            "event": "error",
            "error_code": error_code,       # e.g. "occlusion_left_side"
            "error_stage": error_stage,     # quality_gate · biomechanics · haiku_call_1 · opencv_part_2 · haiku_call_2 · pipeline
            "retryable": retryable,         # "true" or "false" — always a string
            "message": message,             # internal message — NOT shown to user
            "status": "failed",             # tells the SSE subscriber to close the stream
        }
        if session_id:
            payload_dict["session_id"] = session_id
        if user_id:
            payload_dict["user_id"] = user_id

        # For occlusion and out-of-frame errors, pass through the landmark data.
        # This tells us exactly which body part was blocked — useful for future
        # visualizations and debugging.
        if landmark_medians:
            payload_dict["landmark_medians"] = landmark_medians

        payload = json.dumps(payload_dict)

        print(f"[SSE] Sending error event: {error_code} ({error_stage}) for {analysis_id}")

        self.latest_event[analysis_id] = payload

        if analysis_id not in self.active_connections:
            print(f"[SSE] No active connections for {analysis_id}")
            return

        print(f"[SSE] Broadcasting error to {len(self.active_connections[analysis_id])} clients")

        for queue in self.active_connections[analysis_id]:
            await queue.put(payload)


# One shared instance used across the whole app.
# Every route and every pipeline step imports this same object.
sse_manager = SSEManager()
