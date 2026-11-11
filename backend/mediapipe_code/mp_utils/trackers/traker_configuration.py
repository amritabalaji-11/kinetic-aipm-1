THRESHOLD_DOWN = 150
THRESHOLD_UP = 155
MIN_BOTTOM_HOLD = 1
THRESHOLD_DEEP = 120

# A rep also counts as finished when the person turns round on the way up, without a full stand-up.
# This stops quick sets (no full lockout between squats) from being merged into fewer reps.
TURNAROUND_MIN_PEAK = 135   # the hip angle had to climb at least this far (close to standing)
TURNAROUND_DROP = 8         # and then fall this many degrees from its highest point

# Coming up from the bottom is also recognised by how far the hip angle has climbed from this rep's own lowest point,
# not only by passing 150 degrees. People who lean forward never open past 150, so a fixed line missed their reps.
ASCENT_RISE = 30
