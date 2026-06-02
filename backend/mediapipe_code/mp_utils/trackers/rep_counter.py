from mediapipe_code.mp_utils.trackers.traker_configuration import MIN_BOTTOM_HOLD, THRESHOLD_DEEP, THRESHOLD_DOWN, THRESHOLD_UP


class RepCounter:
    """
    Centralized event-driven Rep Lifecycle Manager.
    Acts as the single source of truth for exercise states and transitions,
    preventing state-drift bugs across multiple biomechanics trackers.
    """
    def __init__(self):
        self.state = "STANDING"
        self.rep_count = 0
        self.hip_angle_threshold_down = THRESHOLD_DOWN
        self.hip_angle_threshold_up = THRESHOLD_UP
        self.bottom_angle = THRESHOLD_DEEP
        self.min_bottom_hold = MIN_BOTTOM_HOLD
        self.bottom_hold_frames = 0

    def update(self, hip_angle, debug=False):
        """
        Update the rep state machine using the hip angle and return state transitions.

        Args:
            hip_angle: Current hip angle in degrees.
            debug: Boolean to print state transitions.

        Returns:
            event: String event code if a transition occurred, else None.
            rep_count: The current completed rep count.
        """
        if hip_angle is None:
            return None, self.rep_count

        state = self.state
        down_th = self.hip_angle_threshold_down
        up_th = self.hip_angle_threshold_up
        bottom_th = self.bottom_angle
        min_bottom_hold = self.min_bottom_hold

        # STANDING -> DESCENDING
        if state == "STANDING":
            if hip_angle < down_th:
                self.state = "DESCENDING"
                if debug:
                    print("[Rep Lifecycle] STANDING -> DESCENDING")
                return "descending_started", self.rep_count
            return None, self.rep_count

        # DESCENDING -> BOTTOM
        if state == "DESCENDING":
            if hip_angle < bottom_th:
                self.state = "BOTTOM"
                self.bottom_hold_frames = 0
                if debug:
                    print("[Rep Lifecycle] DESCENDING -> BOTTOM")
                return "bottom_reached", self.rep_count
            return None, self.rep_count

        # BOTTOM -> ASCENDING (or reset if too short)
        if state == "BOTTOM":
            self.bottom_hold_frames += 1

            if hip_angle > down_th:
                if self.bottom_hold_frames >= min_bottom_hold:
                    self.state = "ASCENDING"
                    if debug:
                        print(f"[Rep Lifecycle] BOTTOM -> ASCENDING (hold frames: {self.bottom_hold_frames})")
                    return "ascending_started", self.rep_count
                else:
                    self.state = "STANDING"
                    if debug:
                        print(f"[Rep Lifecycle] BOTTOM -> STANDING (Reset: hold frames {self.bottom_hold_frames} < {min_bottom_hold})")
                    return "reset", self.rep_count
            return None, self.rep_count

        # ASCENDING -> STANDING (Rep completed)
        if state == "ASCENDING":
            if hip_angle > up_th:
                self.rep_count += 1
                self.state = "STANDING"
                if debug:
                    print(f"[Rep Lifecycle] ASCENDING -> STANDING (Rep {self.rep_count} completed!)")
                return "rep_completed", self.rep_count

        return None, self.rep_count