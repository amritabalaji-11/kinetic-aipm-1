from utils.trackers.traker_configuration import BOTTOM_HOLD_FRAMES, MIN_BOTTOM_HOLD, THRESHOLD_DEEP, THRESHOLD_DOWN, THRESHOLD_UP


class RepCounter:
    def __init__(self):
        self.state = "STANDING"  # STANDING, DESCENDING, BOTTOM, ASCENDING
        self.rep_count = 0
        self.hip_angle_threshold_down = THRESHOLD_DOWN  # Below this = in squat
        self.hip_angle_threshold_up = THRESHOLD_UP   # Above this = standing
        self.bottom_hold_frames = BOTTOM_HOLD_FRAMES
        self.min_bottom_hold = MIN_BOTTOM_HOLD  # Must hold bottom for 3 frames
        self.bottom_angle = THRESHOLD_DEEP
    
    def update(self, hip_angle, knee_angle, camera_view, debug = False):
        """
        Update state machine with current angles
        
        Returns:
            rep_completed: Boolean (True if a rep just finished)
        """
        rep_completed = False
        target_angle = hip_angle if "side" not in camera_view else knee_angle
        
        if self.state == "STANDING":
            # Waiting for descent
            if target_angle < self.hip_angle_threshold_down:
                self.state = "DESCENDING"
                if debug:
                    print("Descending...")
        
        elif self.state == "DESCENDING":
            # Going down, check if reached bottom
            # Bottom = hip angle reaches minimum
            if target_angle < self.bottom_angle:  # Deep enough
                self.state = "BOTTOM"
                self.bottom_hold_frames = 0
        
        elif self.state == "BOTTOM":
            # At bottom, waiting to ascend
            self.bottom_hold_frames += 1
            
            if target_angle > self.hip_angle_threshold_down:
                # Started ascending
                if self.bottom_hold_frames >= self.min_bottom_hold:
                    self.state = "ASCENDING"
                    if debug:
                        print("Ascending...")
                else:
                    # Didn't hold bottom long enough - partial rep
                    self.state = "STANDING"
                    if debug:
                        print("Partial rep - didn't reach full depth")
        
        elif self.state == "ASCENDING":
            # Coming up, check if reached top
            if target_angle > self.hip_angle_threshold_up:
                # Rep completed!
                self.rep_count += 1
                self.state = "STANDING"
                rep_completed = True
                if debug:
                    print(f"Rep {self.rep_count} completed!")
        
        return rep_completed, self.rep_count