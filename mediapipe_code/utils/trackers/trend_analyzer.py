from collections import Counter
import numpy as np

    
class TrendAnalyzer:

    def safe_values(self,values):
        return [v for v in values if v is not None]


    def safe_mean(self,values):
        vals = self.safe_values(values)
        return round(float(np.mean(vals)), 4) if vals else None


    def safe_median(self,values):
        vals = self.safe_values(values)
        return round(float(np.median(vals)), 4) if vals else None


    def trend_slope(self,values):
        """
        Linear slope across reps.
        Positive = increasing over reps.
        """
        clean = [(i, v) for i, v in enumerate(values) if v is not None]
        if len(clean) < 2:
            return None

        x = np.array([i for i, _ in clean], dtype=np.float32)
        y = np.array([v for _, v in clean], dtype=np.float32)

        slope, _ = np.polyfit(x, y, 1)
        return round(float(slope), 4)


    def count_true(self,values):
        return sum(1 for v in values if v is True)


    def distribution(self,values):
        vals = [v for v in values if v is not None]
        return dict(Counter(vals))


    def mode_value(self,values):
        vals = [v for v in values if v is not None]
        if not vals:
            return None
        return Counter(vals).most_common(1)[0][0]


    def build_consolidated_summary(self,reps, camera_view):
        """
        Builds the consolidated block for the final JSON.
        Expects reps to be a list of rep dictionaries.
        """

        total_reps = len(reps)

        back_angle_max_values = [
            r.get("back_data", {}).get("back_angle_max")
            for r in reps
        ]

        back_angle_bottom_values = [
            r.get("back_data", {}).get("back_angle_at_bottom")
            for r in reps
        ]

        back_status_values = [
            r.get("back_data", {}).get("status")
            for r in reps
        ]

        knee_valgus_values = [
            r.get("stability_data", {}).get("knee_valgus_distance")
            for r in reps
        ]

        valgus_flag_values = [
            r.get("stability_data", {}).get("valgus_flag")
            for r in reps
        ]

        valgus_phase_values = [
            r.get("stability_data", {}).get("valgus_phase")
            for r in reps
        ]

        heel_lift_values = [
            r.get("stability_data", {}).get("heel_lift_detected")
            for r in reps
        ]

        depth_distribution_values = [
            r.get("depth_data", {}).get("depth_classification")
            for r in reps
        ]

        knee_angle_min_values = [
            r.get("depth_data", {}).get("knee_angle_min")
            for r in reps
        ]

        depth_insufficient_values = [
            r.get("depth_data", {}).get("depth_insufficient_flag")
            for r in reps
        ]

        ankle_dorsiflexion_values = [
            r.get("ankle_data", {}).get("dorsiflexion_at_bottom")
            for r in reps
        ]

        foot_turnout_left_values = [
            r.get("ankle_data", {}).get("foot_turnout_left")
            for r in reps
        ]

        foot_turnout_right_values = [
            r.get("ankle_data", {}).get("foot_turnout_right")
            for r in reps
        ]

        eccentric_values = [
            r.get("tempo_data", {}).get("eccentric")
            for r in reps
        ]

        pause_values = [
            r.get("tempo_data", {}).get("pause")
            for r in reps
        ]

        concentric_values = [
            r.get("tempo_data", {}).get("concentric")
            for r in reps
        ]

        total_values = [
            r.get("tempo_data", {}).get("total")
            for r in reps
        ]

        tempo_notation_values = [
            r.get("tempo_data", {}).get("tempo_notation")
            for r in reps
        ]

        if camera_view in ("front", "angled"):

            consolidated = {
                "total_reps": total_reps,

                "posture": {
                    "back_angle_max_mean": self.safe_mean(back_angle_max_values),
                    "back_angle_at_bottom_mean": self.safe_mean(back_angle_bottom_values),
                    "back_angle_trend": self.trend_slope(back_angle_max_values),
                    "status_distribution": self.distribution(back_status_values),
                },

                "stability": {
                    "knee_valgus_mean": self.safe_mean(knee_valgus_values),
                    "knee_valgus_trend": self.trend_slope(knee_valgus_values),
                    "valgus_flag_reps": self.count_true(valgus_flag_values),
                    "valgus_phase_distribution": self.distribution(valgus_phase_values),
                    "heel_lift_reps": self.count_true(heel_lift_values),
                },

                "movement_quality": {
                    "depth_distribution": self.distribution(depth_distribution_values),
                    "knee_angle_min_mean": self.safe_mean(knee_angle_min_values),
                    "depth_trend": self.trend_slope(knee_angle_min_values),
                    "depth_insufficient_reps": self.count_true(depth_insufficient_values),
                    "foot_turnout_left_mean": self.safe_mean(foot_turnout_left_values),
                    "foot_turnout_right_mean": self.safe_mean(foot_turnout_right_values),
                },

                "tempo": {
                    "eccentric_mean": self.safe_mean(eccentric_values),
                    "pause_mean": self.safe_mean(pause_values),
                    "concentric_mean": self.safe_mean(concentric_values),
                    "total_mean": self.safe_mean(total_values),
                    "total_trend": self.trend_slope(total_values),
                    "tempo_notation_mode": self.mode_value(tempo_notation_values),
                }
            }

        if "side" in camera_view:
            consolidated = {
                "total_reps": total_reps,

                "posture": {
                    "back_angle_max_mean": self.safe_mean(back_angle_max_values),
                    "back_angle_at_bottom_mean": self.safe_mean(back_angle_bottom_values),
                    "back_angle_trend": self.trend_slope(back_angle_max_values),
                    "status_distribution": self.distribution(back_status_values),
                },
                "movement_quality": {
                    "depth_distribution": self.distribution(depth_distribution_values),
                    "knee_angle_min_mean": self.safe_mean(knee_angle_min_values),
                    "depth_trend": self.trend_slope(knee_angle_min_values),
                    "depth_insufficient_reps": self.count_true(depth_insufficient_values),
                    "ankle_dorsiflexion_trend": self.mode_value(ankle_dorsiflexion_values),
                },

                "tempo": {
                    "eccentric_mean": self.safe_mean(eccentric_values),
                    "pause_mean": self.safe_mean(pause_values),
                    "concentric_mean": self.safe_mean(concentric_values),
                    "total_mean": self.safe_mean(total_values),
                    "total_trend": self.trend_slope(total_values),
                    "tempo_notation_mode": self.mode_value(tempo_notation_values),
                }
            }

        return consolidated