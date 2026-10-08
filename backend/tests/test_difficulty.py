from app.services.difficulty import suggest_difficulty, trend


def test_no_scores_defaults_to_medium():
    assert suggest_difficulty([])[0] == "Medium"


def test_high_average_suggests_hard():
    assert suggest_difficulty([80, 80, 80])[0] == "Hard"


def test_low_average_suggests_easy():
    assert suggest_difficulty([40, 40, 40])[0] == "Easy"


def test_uses_only_last_three():
    level, reason = suggest_difficulty([10, 10, 10, 90, 90, 90])
    assert level == "Hard" and "last 3" in reason
    assert suggest_difficulty([60])[0] == "Medium"


def test_trend_improving():
    assert trend([40, 40, 40, 80, 80, 80]) == "improving"


def test_trend_declining():
    assert trend([80, 80, 80, 40, 40, 40]) == "declining"


def test_trend_steady_and_not_enough_data():
    assert trend([60, 60, 60, 60]) == "steady"
    assert trend([60, 70, 80]) == "not_enough_data"