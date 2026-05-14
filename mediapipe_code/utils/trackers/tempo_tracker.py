import time
from utils.trackers.traker_configuration import THRESHOLD_DOWN, THRESHOLD_UP, THRESHOLD_DEEP


class TempoTracker:
    def __init__(self):
        self.state = "STANDING"
        self.phase_start_time = None

        self.eccentric_time = 0.0
        self.pause_time = 0.0
        self.concentric_time = 0.0

        self.hip_angle_threshold_down = THRESHOLD_DOWN
        self.hip_angle_threshold_up = THRESHOLD_UP
        self.bottom_angle = THRESHOLD_DEEP

        self.current_rep_tempo = None

    def update(self, hip_angle, knee_angle, camera_view, timestamp=None, debug=False):
        if timestamp is None:
            timestamp = time.time()

        # Side view uses knee angle, front/angled uses hip angle
        target_angle = knee_angle if camera_view.startswith("side") else hip_angle

        if target_angle is None:
            return None

        state = self.state
        down_th = self.hip_angle_threshold_down
        up_th = self.hip_angle_threshold_up
        bottom_th = self.bottom_angle

        if state == "STANDING":
            if target_angle < down_th:
                self.state = "DESCENDING"
                self.phase_start_time = timestamp
                self.eccentric_time = 0.0
                self.pause_time = 0.0
                self.concentric_time = 0.0
                if debug:
                    print("Started eccentric phase (lowering)")
            return None

        if state == "DESCENDING":
            self.eccentric_time = timestamp - self.phase_start_time

            if target_angle < bottom_th:
                self.state = "BOTTOM"
                self.phase_start_time = timestamp
                self.pause_time = 0.0
                if debug:
                    print(f"Reached bottom. Eccentric time: {self.eccentric_time:.2f}s")
            return None

        if state == "BOTTOM":
            self.pause_time = timestamp - self.phase_start_time

            if target_angle > bottom_th + 10:
                self.state = "ASCENDING"
                self.phase_start_time = timestamp
                self.concentric_time = 0.0
                if debug:
                    print(f"Started concentric phase (rising). Pause time: {self.pause_time:.2f}s")
            return None

        if state == "ASCENDING":
            self.concentric_time = timestamp - self.phase_start_time

            if target_angle > up_th:
                total_time = self.eccentric_time + self.pause_time + self.concentric_time

                tempo_data = {
                    "eccentric": round(self.eccentric_time, 2),
                    "pause": round(self.pause_time, 2),
                    "concentric": round(self.concentric_time, 2),
                    "total_time": round(total_time, 2),
                    "tempo_notation": f"{self.eccentric_time:.0f}-{self.pause_time:.0f}-{self.concentric_time:.0f}",
                }

                self.state = "STANDING"
                self.phase_start_time = None
                self.current_rep_tempo = tempo_data

                if debug:
                    print(f"Rep completed! Tempo: {tempo_data['tempo_notation']}")
                    print(f"  Eccentric: {tempo_data['eccentric']}s")
                    print(f"  Pause: {tempo_data['pause']}s")
                    print(f"  Concentric: {tempo_data['concentric']}s")
                    print(f"  Total: {tempo_data['total_time']}s")

                return tempo_data

        return None