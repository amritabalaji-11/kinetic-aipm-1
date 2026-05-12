from collections import Counter
from typing import Any, Dict, Optional


class TrendAnalyzer:
    @staticmethod
    def _mean(sum_value: float, count: int) -> Optional[float]:
        if count == 0:
            return None
        return round(sum_value / count, 4)

    @staticmethod
    def _trend_slope_from_sums(
        n: int,
        sum_x: float,
        sum_y: float,
        sum_x2: float,
        sum_xy: float,
    ) -> Optional[float]:
        """
        Linear regression slope computed from running sums.
        """
        denom = n * sum_x2 - (sum_x * sum_x)
        if n < 2 or denom == 0:
            return None
        slope = (n * sum_xy - sum_x * sum_y) / denom
        return round(float(slope), 4)

    @staticmethod
    def _distribution(counter: Dict[Any, int]) -> Dict[Any, int]:
        return dict(counter)

    @staticmethod
    def _mode(counter: Dict[Any, int]) -> Optional[Any]:
        if not counter:
            return None
        return max(counter, key=counter.get)

    @staticmethod
    def _count_true(true_count: int) -> int:
        return true_count

    def build_consolidated_summary(self, reps, camera_view):
        total_reps = len(reps)

        # Running stats
        back_angle_max_sum = 0.0
        back_angle_max_count = 0
        back_angle_max_x = 0.0
        back_angle_max_x2 = 0.0
        back_angle_max_xy = 0.0

        back_angle_bottom_sum = 0.0
        back_angle_bottom_count = 0

        knee_valgus_sum = 0.0
        knee_valgus_count = 0
        knee_valgus_x = 0.0
        knee_valgus_x2 = 0.0
        knee_valgus_xy = 0.0

        knee_angle_min_sum = 0.0
        knee_angle_min_count = 0
        knee_angle_min_x = 0.0
        knee_angle_min_x2 = 0.0
        knee_angle_min_xy = 0.0

        eccentric_sum = 0.0
        eccentric_count = 0

        pause_sum = 0.0
        pause_count = 0

        concentric_sum = 0.0
        concentric_count = 0

        total_sum = 0.0
        total_count = 0
        total_x = 0.0
        total_x2 = 0.0
        total_xy = 0.0

        back_status_counter = Counter()
        valgus_phase_counter = Counter()
        depth_counter = Counter()
        tempo_notation_counter = Counter()

        valgus_flag_count = 0
        heel_lift_count = 0
        depth_insufficient_count = 0

        foot_turnout_left_sum = 0.0
        foot_turnout_left_count = 0

        foot_turnout_right_sum = 0.0
        foot_turnout_right_count = 0

        ankle_dorsiflexion_values = []

        for i, rep in enumerate(reps):
            back = rep.get("back_data", {})
            stability = rep.get("stability_data", {})
            depth = rep.get("depth_data", {})
            ankle = rep.get("ankle_data", {})
            tempo = rep.get("tempo_data", {})

            back_angle_max = back.get("back_angle_max")
            if back_angle_max is not None:
                back_angle_max_sum += back_angle_max
                back_angle_max_count += 1
                back_angle_max_x += i
                back_angle_max_x2 += i * i
                back_angle_max_xy += i * back_angle_max

            back_angle_bottom = back.get("back_angle_at_bottom")
            if back_angle_bottom is not None:
                back_angle_bottom_sum += back_angle_bottom
                back_angle_bottom_count += 1

            status = back.get("status")
            if status is not None:
                back_status_counter[status] += 1

            knee_valgus = stability.get("knee_valgus_distance")
            if knee_valgus is not None:
                knee_valgus_sum += knee_valgus
                knee_valgus_count += 1
                knee_valgus_x += i
                knee_valgus_x2 += i * i
                knee_valgus_xy += i * knee_valgus

            valgus_phase = stability.get("valgus_phase")
            if valgus_phase is not None:
                valgus_phase_counter[valgus_phase] += 1

            if stability.get("valgus_flag") is True:
                valgus_flag_count += 1

            if stability.get("heel_lift_detected") is True:
                heel_lift_count += 1

            depth_classification = depth.get("depth_classification")
            if depth_classification is not None:
                depth_counter[depth_classification] += 1

            knee_angle_min = depth.get("knee_angle_min")
            if knee_angle_min is not None:
                knee_angle_min_sum += knee_angle_min
                knee_angle_min_count += 1
                knee_angle_min_x += i
                knee_angle_min_x2 += i * i
                knee_angle_min_xy += i * knee_angle_min

            if depth.get("depth_insufficient_flag") is True:
                depth_insufficient_count += 1

            foot_turnout_left = ankle.get("foot_turnout_left")
            if foot_turnout_left is not None:
                foot_turnout_left_sum += foot_turnout_left
                foot_turnout_left_count += 1

            foot_turnout_right = ankle.get("foot_turnout_right")
            if foot_turnout_right is not None:
                foot_turnout_right_sum += foot_turnout_right
                foot_turnout_right_count += 1

            dorsiflexion_bottom = ankle.get("dorsiflexion_at_bottom")
            if dorsiflexion_bottom is not None:
                ankle_dorsiflexion_values.append(dorsiflexion_bottom)

            eccentric = tempo.get("eccentric")
            if eccentric is not None:
                eccentric_sum += eccentric
                eccentric_count += 1

            pause = tempo.get("pause")
            if pause is not None:
                pause_sum += pause
                pause_count += 1

            concentric = tempo.get("concentric")
            if concentric is not None:
                concentric_sum += concentric
                concentric_count += 1

            total = tempo.get("total")
            if total is not None:
                total_sum += total
                total_count += 1
                total_x += i
                total_x2 += i * i
                total_xy += i * total

            tempo_notation = tempo.get("tempo_notation")
            if tempo_notation is not None:
                tempo_notation_counter[tempo_notation] += 1

        consolidated = {
            "total_reps": total_reps,
            "posture": {
                "back_angle_max_mean": self._mean(back_angle_max_sum, back_angle_max_count),
                "back_angle_at_bottom_mean": self._mean(back_angle_bottom_sum, back_angle_bottom_count),
                "back_angle_trend": self._trend_slope_from_sums(
                    back_angle_max_count,
                    back_angle_max_x,
                    back_angle_max_sum,
                    back_angle_max_x2,
                    back_angle_max_xy,
                ),
                "status_distribution": self._distribution(back_status_counter),
            },
            "tempo": {
                "eccentric_mean": self._mean(eccentric_sum, eccentric_count),
                "pause_mean": self._mean(pause_sum, pause_count),
                "concentric_mean": self._mean(concentric_sum, concentric_count),
                "total_mean": self._mean(total_sum, total_count),
                "total_trend": self._trend_slope_from_sums(
                    total_count,
                    total_x,
                    total_sum,
                    total_x2,
                    total_xy,
                ),
                "tempo_notation_mode": self._mode(tempo_notation_counter),
            },
        }

        if camera_view in ("front", "angled"):
            consolidated["stability"] = {
                "knee_valgus_mean": self._mean(knee_valgus_sum, knee_valgus_count),
                "knee_valgus_trend": self._trend_slope_from_sums(
                    knee_valgus_count,
                    knee_valgus_x,
                    knee_valgus_sum,
                    knee_valgus_x2,
                    knee_valgus_xy,
                ),
                "valgus_flag_reps": valgus_flag_count,
                "valgus_phase_distribution": self._distribution(valgus_phase_counter),
                "heel_lift_reps": heel_lift_count,
            }

            consolidated["movement_quality"] = {
                "depth_distribution": self._distribution(depth_counter),
                "knee_angle_min_mean": self._mean(knee_angle_min_sum, knee_angle_min_count),
                "depth_trend": self._trend_slope_from_sums(
                    knee_angle_min_count,
                    knee_angle_min_x,
                    knee_angle_min_sum,
                    knee_angle_min_x2,
                    knee_angle_min_xy,
                ),
                "depth_insufficient_reps": depth_insufficient_count,
                "foot_turnout_left_mean": self._mean(foot_turnout_left_sum, foot_turnout_left_count),
                "foot_turnout_right_mean": self._mean(foot_turnout_right_sum, foot_turnout_right_count),
            }

        elif "side" in camera_view:
            consolidated["movement_quality"] = {
                "depth_distribution": self._distribution(depth_counter),
                "knee_angle_min_mean": self._mean(knee_angle_min_sum, knee_angle_min_count),
                "depth_trend": self._trend_slope_from_sums(
                    knee_angle_min_count,
                    knee_angle_min_x,
                    knee_angle_min_sum,
                    knee_angle_min_x2,
                    knee_angle_min_xy,
                ),
                "depth_insufficient_reps": depth_insufficient_count,
                "ankle_dorsiflexion_trend": self._mode(Counter(ankle_dorsiflexion_values)),
            }

        return consolidated