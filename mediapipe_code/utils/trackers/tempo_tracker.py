import time
from utils.trackers.traker_configuration import THRESHOLD_DOWN, THRESHOLD_UP, THRESHOLD_DEEP


class TempoTracker:
    def __init__(self):
        self.state = "STANDING"
        self.phase_start_time = None
        self.eccentric_time = 0  # Time lowering
        self.pause_time = 0      # Time at bottom
        self.concentric_time = 0 # Time rising
        
        # Thresholds
        self.hip_angle_threshold_down = THRESHOLD_DOWN
        self.hip_angle_threshold_up = THRESHOLD_UP
        self.bottom_angle = THRESHOLD_DEEP  # What counts as "bottom"
        
        # Current rep data
        self.current_rep_tempo = None
    
    def update(self, hip_angle, knee_angle, camera_view, timestamp=None, debug = False):
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
        target_angle = hip_angle if "side" not in camera_view else knee_angle
        
        # State: STANDING → DESCENDING
        if self.state == "STANDING":
            if target_angle < self.hip_angle_threshold_down:
                self.state = "DESCENDING"
                self.phase_start_time = timestamp
                self.eccentric_time = 0
                if debug:
                    print("Started eccentric phase (lowering)")
        
        # State: DESCENDING (Eccentric Phase)
        elif self.state == "DESCENDING":
            self.eccentric_time = timestamp - self.phase_start_time
            
            # Check if reached bottom
            if target_angle < self.bottom_angle:
                self.state = "BOTTOM"
                self.phase_start_time = timestamp
                self.pause_time = 0
                if debug:
                    print(f"Reached bottom. Eccentric time: {self.eccentric_time:.2f}s")
        
        # State: BOTTOM (Pause Phase)
        elif self.state == "BOTTOM":
            self.pause_time = timestamp - self.phase_start_time
            
            # Check if started ascending
            if target_angle > self.bottom_angle + 10:  # Small buffer
                self.state = "ASCENDING"
                self.phase_start_time = timestamp
                self.concentric_time = 0
                if debug:
                    print(f"Started concentric phase (rising). Pause time: {self.pause_time:.2f}s")
        
        # State: ASCENDING (Concentric Phase)
        elif self.state == "ASCENDING":
            self.concentric_time = timestamp - self.phase_start_time
            
            # Check if reached top
            if target_angle > self.hip_angle_threshold_up:
                    
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
                }
                
                self.state = "STANDING"
                self.current_rep_tempo = tempo_data
                
                if debug:
                    print(f"Rep completed! Tempo: {tempo_data['tempo_notation']}")
                    print(f"  Eccentric: {tempo_data['eccentric']}s")
                    print(f"  Pause: {tempo_data['pause']}s")
                    print(f"  Concentric: {tempo_data['concentric']}s")
                    print(f"  Total: {tempo_data['total_time']}s")
        
        return tempo_data