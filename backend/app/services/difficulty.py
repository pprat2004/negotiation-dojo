"""Adaptive difficulty: suggest the next level from recent scores."""
from statistics import mean
from typing import Literal

Level = Literal["Easy", "Medium", "Hard"]
HARD_AT = 75     # average at or above this -> Hard
EASY_BELOW = 45  # average below this -> Easy
WINDOW = 3       # how many recent sessions to look at


def suggest_difficulty(scores: list[int]) -> tuple[Level, str]:
    """`scores` are ordered oldest to newest. Returns (level, human-readable reason)."""
    recent = scores[-WINDOW:]
    if not recent:
        return "Medium", "No scored sessions yet, so we start at Medium."
    avg = mean(recent)
    span = f"your last {len(recent)} session{'s' if len(recent) > 1 else ''}"
    if avg >= HARD_AT:
        return "Hard", f"You average {avg:.0f} over {span}. Time to face a tougher opponent."
    if avg < EASY_BELOW:
        return "Easy", f"You average {avg:.0f} over {span}. Build confidence against a friendlier opponent first."
    return "Medium", f"You average {avg:.0f} over {span}. Medium keeps you challenged without overwhelming you."


def trend(scores: list[int]) -> str:
    """Compare the latest 3 scores with the 3 before them (needs at least 4 scores)."""
    if len(scores) < 4:
        return "not_enough_data"
    diff = mean(scores[-3:]) - mean(scores[-6:-3])
    if diff >= 5:
        return "improving"
    if diff <= -5:
        return "declining"
    return "steady"