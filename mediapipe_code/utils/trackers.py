import time


class RepCounter:
    def __init__(self):
        self.state = "STANDING"  # STANDING, DESCENDING, BOTTOM, ASCENDING
        self.rep_count = 0
        self.hip_angle_threshold_down = 100  # Below this = in squat
        self.hip_angle_threshold_up = 160   # Above this = standing
        self.bottom_hold_frames = 0
        self.min_bottom_hold = 3  # Must hold bottom for 3 frames
    
    def update(self, hip_angle, knee_angle):
        """
        Update state machine with current angles
        
        Returns:
            rep_completed: Boolean (True if a rep just finished)
        """
        rep_completed = False
        
        if self.state == "STANDING":
            # Waiting for descent
            if hip_angle < self.hip_angle_threshold_down:
                self.state = "DESCENDING"
                print("Descending...")
        
        elif self.state == "DESCENDING":
            # Going down, check if reached bottom
            # Bottom = hip angle reaches minimum
            if hip_angle < 90:  # Deep enough
                self.state = "BOTTOM"
                self.bottom_hold_frames = 0
        
        elif self.state == "BOTTOM":
            # At bottom, waiting to ascend
            self.bottom_hold_frames += 1
            
            if hip_angle > self.hip_angle_threshold_down:
                # Started ascending
                if self.bottom_hold_frames >= self.min_bottom_hold:
                    self.state = "ASCENDING"
                    print("Ascending...")
                else:
                    # Didn't hold bottom long enough - partial rep
                    self.state = "STANDING"
                    print("Partial rep - didn't reach full depth")
        
        elif self.state == "ASCENDING":
            # Coming up, check if reached top
            if hip_angle > self.hip_angle_threshold_up:
                # Rep completed!
                self.rep_count += 1
                self.state = "STANDING"
                rep_completed = True
                print(f"Rep {self.rep_count} completed!")
        
        return rep_completed, self.rep_count


class TempoTracker:
    def __init__(self):
        self.state = "STANDING"
        self.phase_start_time = None
        self.eccentric_time = 0  # Time lowering
        self.pause_time = 0      # Time at bottom
        self.concentric_time = 0 # Time rising
        self.min_hip_angle = 0.0
        
        # Thresholds
        self.hip_angle_threshold_down = 100
        self.hip_angle_threshold_up = 160
        self.bottom_angle = 90  # What counts as "bottom"
        self.deep_squat_angle = 80
        
        # Current rep data
        self.current_rep_tempo = None
    
    def update(self, hip_angle, timestamp=None):
        """
        Track tempo through squat phases
        
        Args:
            hip_angle: Current hip angle in degrees
            timestamp: Current time (if None, uses time.time())
        
        Returns:
            tempo_data: Dict with phase times (or None if rep not complete)
        """
        if timestamp is None:
            timestamp = time.time()
        
        tempo_data = None
        
        # State: STANDING → DESCENDING
        if self.state == "STANDING":
            if hip_angle < self.hip_angle_threshold_down:
                self.state = "DESCENDING"
                self.phase_start_time = timestamp
                self.eccentric_time = 0
                self.min_hip_angle = hip_angle
                print("Started eccentric phase (lowering)")
        
        # State: DESCENDING (Eccentric Phase)
        elif self.state == "DESCENDING":
            self.eccentric_time = timestamp - self.phase_start_time

            self.min_hip_angle = min(self.min_hip_angle, hip_angle)
            
            # Check if reached bottom
            if hip_angle < self.bottom_angle:
                self.state = "BOTTOM"
                self.phase_start_time = timestamp
                self.pause_time = 0
                print(f"Reached bottom. Eccentric time: {self.eccentric_time:.2f}s")
        
        # State: BOTTOM (Pause Phase)
        elif self.state == "BOTTOM":
            self.pause_time = timestamp - self.phase_start_time

            self.min_hip_angle = min(self.min_hip_angle, hip_angle)
            
            # Check if started ascending
            if hip_angle > self.bottom_angle + 10:  # Small buffer
                self.state = "ASCENDING"
                self.phase_start_time = timestamp
                self.concentric_time = 0
                print(f"Started concentric phase (rising). Pause time: {self.pause_time:.2f}s")
        
        # State: ASCENDING (Concentric Phase)
        elif self.state == "ASCENDING":
            self.concentric_time = timestamp - self.phase_start_time

            self.min_hip_angle = min(self.min_hip_angle, hip_angle)
            
            # Check if reached top
            if hip_angle > self.hip_angle_threshold_up:
                # Rep completed!
                tempo_data = {
                    'eccentric': round(self.eccentric_time, 2),
                    'pause': round(self.pause_time, 2),
                    'concentric': round(self.concentric_time, 2),
                    'total_time': round(
                        self.eccentric_time + self.pause_time + self.concentric_time, 
                        2
                    ),
                    'tempo_notation': f"{self.eccentric_time:.0f}-{self.pause_time:.0f}-{self.concentric_time:.0f}",
                    'squat_type': ("NORMAL" if self.min_hip_angle > self.deep_squat_angle
                                   else "DEEP")
                }
                
                self.state = "STANDING"
                self.current_rep_tempo = tempo_data
                
                print(f"Rep completed! Tempo: {tempo_data['tempo_notation']}")
                print(f"  Squat type: {tempo_data['squat_type']}")
                print(f"  Eccentric: {tempo_data['eccentric']}s")
                print(f"  Pause: {tempo_data['pause']}s")
                print(f"  Concentric: {tempo_data['concentric']}s")
                print(f"  Total: {tempo_data['total_time']}s")
        
        return tempo_data


class BackAngleTracker:
    def __init__(self):
        self.state = "STANDING"
        self.phase_start_time = None

        # Thresholds
        self.hip_angle_threshold_up = 160
        self.hip_angle_threshold_down = 100
        self.upright_threshold = 20      # good angle
        self.warning_threshold = 40      # acceptable angle
        self.reset()

    def reset(self):
        self.state = "STANDING"
        self.phase_start_time = None

        self.max_back_angle = 0.0
        self.time_upright = 0.0
        self.time_warning = 0.0
        self.time_excessive = 0.0

        self.current_rep_data = None

    def update(self, back_angle, hip_angle, timestamp=None):
        """
        Track back angle through squat phases.
        """
        if timestamp is None:
            timestamp = time.time()

        rep_data = None

        # -------------------------
        # State: STANDING
        # -------------------------
        if self.state == "STANDING":
            # Detect start of descent
            if hip_angle < self.hip_angle_threshold_down:
                self.state = "DESCENDING"
                self.phase_start_time = timestamp
                self.max_back_angle = back_angle  # initialize max angle

        # -------------------------
        # State: DESCENDING
        # -------------------------
        elif self.state == "DESCENDING":
            elapsed = timestamp - self.phase_start_time

            # Track maximum back angle during the rep
            self.max_back_angle = max(self.max_back_angle, back_angle)

            # Detect end of rep (when returning upright)
            if hip_angle > self.hip_angle_threshold_up:

                # Classify based on worst back angle reached
                if self.max_back_angle <= self.upright_threshold:
                    status = "GOOD"
                elif self.max_back_angle <= self.warning_threshold:
                    status = "ACCEPTABLE"
                else:
                    status = "EXCESSIVE_LEAN"

                # Build rep summary
                rep_data = {
                    "max_back_angle": round(self.max_back_angle, 2),
                    "time_warning": round(self.time_warning, 2),
                    "time_excessive": round(self.time_excessive, 2),
                    "status": status
                }

                self.current_rep_data = rep_data
                self.reset()  # reset state for next rep

                # Debug output
                print(f"BACK INFO max_back_angle: {rep_data['max_back_angle']}")
                print(f"  time_warning: {rep_data['time_warning']}s")
                print(f"  time_excessive: {rep_data['time_excessive']}s")
                print(f"  status: {rep_data['status']}")

                return rep_data

            # Accumulate time spent in each risk zone
            if self.upright_threshold < back_angle <= self.warning_threshold:
                self.time_warning = elapsed
            elif back_angle > self.warning_threshold:
                self.time_excessive = elapsed

        return None
    

class KneeValgusTracker:
    def __init__(self):
        self.state = "STANDING"
        self.phase_start_time = None

        # squat thresholds
        self.hip_angle_threshold_up = 160
        self.hip_angle_threshold_down = 100

        # valgus thresholds
        self.good_threshold = 0.02
        self.warning_threshold = 0.08

        self.reset()

    def reset(self):
        self.state = "STANDING"
        self.phase_start_time = None

        # LEFT
        self.max_valgus_left = 0.0
        self.time_warning_left = 0.0
        self.time_excessive_left = 0.0

        # RIGHT
        self.max_valgus_right = 0.0
        self.time_warning_right = 0.0
        self.time_excessive_right = 0.0

        self.last_timestamp = None
        self.current_rep_data = None

    def classify(self, v):
        if v <= self.good_threshold:
            return "GOOD"
        elif v <= self.warning_threshold:
            return "ACCEPTABLE"
        else:
            return "VALGUS"

    def update(self, valgus_left, valgus_right, hip_angle, timestamp=None):
        if timestamp is None:
            timestamp = time.time()

        # Initialize timestamp on first call
        if self.last_timestamp is None:
            self.last_timestamp = timestamp
            return None

        # Time delta between frames
        dt = timestamp - self.last_timestamp
        self.last_timestamp = timestamp

        # Use absolute valgus (ignore direction)
        vL = abs(valgus_left)
        vR = abs(valgus_right)

        rep_data = None

        # -------------------------
        # State: STANDING → DESCENDING
        # -------------------------
        if self.state == "STANDING":
            # Detect start of descent
            if hip_angle < self.hip_angle_threshold_down:
                self.state = "DESCENDING"
                self.phase_start_time = timestamp
                self.max_valgus_left = vL
                self.max_valgus_right = vR

        # -------------------------
        # State: DESCENDING
        # -------------------------
        elif self.state == "DESCENDING":

            # Track maximum valgus for both knees
            self.max_valgus_left = max(self.max_valgus_left, vL)
            self.max_valgus_right = max(self.max_valgus_right, vR)

            # Accumulate time in warning/excessive zones (LEFT)
            if self.good_threshold < vL <= self.warning_threshold:
                self.time_warning_left += dt
            elif vL > self.warning_threshold:
                self.time_excessive_left += dt

            # Accumulate time in warning/excessive zones (RIGHT)
            if self.good_threshold < vR <= self.warning_threshold:
                self.time_warning_right += dt
            elif vR > self.warning_threshold:
                self.time_excessive_right += dt

            # Detect end of rep (return to standing)
            if hip_angle > self.hip_angle_threshold_up:

                # Classify each knee independently
                status_left = self.classify(self.max_valgus_left)
                status_right = self.classify(self.max_valgus_right)

                # Build rep summary
                rep_data = {
                    "left": {
                        "max_valgus": round(self.max_valgus_left, 4),
                        "time_warning": round(self.time_warning_left, 2),
                        "time_excessive": round(self.time_excessive_left, 2),
                        "status": status_left
                    },
                    "right": {
                        "max_valgus": round(self.max_valgus_right, 4),
                        "time_warning": round(self.time_warning_right, 2),
                        "time_excessive": round(self.time_excessive_right, 2),
                        "status": status_right
                    }
                }

                self.current_rep_data = rep_data
                self.reset()  # reset state for next rep

                # Debug output
                print("\n=== KNEE TRACKING ===")
                print("LEFT:")
                print(f"  max_valgus: {rep_data['left']['max_valgus']}")
                print(f"  time_warning: {rep_data['left']['time_warning']}s")
                print(f"  time_excessive: {rep_data['left']['time_excessive']}s")
                print(f"  status: {rep_data['left']['status']}")
                print("RIGHT:")
                print(f"  max_valgus: {rep_data['right']['max_valgus']}")
                print(f"  time_warning: {rep_data['right']['time_warning']}s")
                print(f"  time_excessive: {rep_data['right']['time_excessive']}s")
                print(f"  status: {rep_data['right']['status']}")
                print("=====================\n")

                return rep_data

        return None