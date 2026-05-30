from mediapipe_code.mp_utils.trackers.traker_configuration import MIN_BOTTOM_HOLD, THRESHOLD_DEEP, THRESHOLD_DOWN, THRESHOLD_UP


class RepCounter:
    def __init__(self):
        self.state = "STANDING"
        self.rep_count = 0
        self.hip_angle_threshold_down = THRESHOLD_DOWN
        self.hip_angle_threshold_up = THRESHOLD_UP
        self.min_bottom_hold = MIN_BOTTOM_HOLD
        self.bottom_angle = THRESHOLD_DEEP
        self.bottom_hold_frames = 0

    def update(self, hip_angle, knee_angle, camera_view, debug=False):
        """
        Update state machine with current angles.

        Returns:
            rep_completed: Boolean (True if a rep just finished)
            rep_count: Current rep count
        """
        target_angle = knee_angle if camera_view.startswith("side") else hip_angle
        if target_angle is None:
            return False, self.rep_count

        state = self.state
        down_th = self.hip_angle_threshold_down
        up_th = self.hip_angle_threshold_up
        bottom_th = self.bottom_angle
        min_bottom_hold = self.min_bottom_hold

        if state == "STANDING":
            if target_angle < down_th:
                self.state = "DESCENDING"
                if debug:
                    print("Descending...")
            return False, self.rep_count

        if state == "DESCENDING":
            if target_angle < bottom_th:
                self.state = "BOTTOM"
                self.bottom_hold_frames = 0
            return False, self.rep_count

        if state == "BOTTOM":
            self.bottom_hold_frames += 1

            if target_angle > down_th:
                if self.bottom_hold_frames >= min_bottom_hold:
                    self.state = "ASCENDING"
                    if debug:
                        print("Ascending...")
                else:
                    self.state = "STANDING"
                    if debug:
                        print("Partial rep - didn't reach full depth")
            return False, self.rep_count

        if state == "ASCENDING":
            if target_angle > up_th:
                self.rep_count += 1
                self.state = "STANDING"
                if debug:
                    print(f"Rep {self.rep_count} completed!")
                return True, self.rep_count

        return False, self.rep_count
    

    def reduce_rep(self):
        self.rep_count -= 1

    def rep_to_zero(self):
        self.rep_count = 0