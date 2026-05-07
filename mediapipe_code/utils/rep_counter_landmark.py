class RepCounterLandmark:
    def __init__(self):
        self.state = "STANDING"  # STANDING, DESCENDING, BOTTOM, ASCENDING
        self.rep_count = 0
        self.hip_angle_threshold_down = 100
        self.hip_angle_threshold_up = 160
        self.bottom_hold_frames = 0
        self.min_bottom_hold = 3

    def update(self, hip_angle, knee_angle):
        """
        Returns:
            rep_started: bool
            rep_completed: bool
            rep_count: int
            state: str
        """
        rep_started = False
        rep_completed = False

        previous_state = self.state

        if self.state == "STANDING":
            if hip_angle < self.hip_angle_threshold_down:
                self.state = "DESCENDING"
                rep_started = True

        elif self.state == "DESCENDING":
            if hip_angle < 90:
                self.state = "BOTTOM"
                self.bottom_hold_frames = 0

        elif self.state == "BOTTOM":
            self.bottom_hold_frames += 1

            if hip_angle > self.hip_angle_threshold_down:
                if self.bottom_hold_frames >= self.min_bottom_hold:
                    self.state = "ASCENDING"
                else:
                    self.state = "STANDING"

        elif self.state == "ASCENDING":
            if hip_angle > self.hip_angle_threshold_up:
                self.rep_count += 1
                self.state = "STANDING"
                rep_completed = True

        return rep_started, rep_completed, self.rep_count, self.state