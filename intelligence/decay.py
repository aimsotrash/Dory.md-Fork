"""
Decay Engine
============

NumPy-vectorized retention computation using modified Ebbinghaus forgetting curve.
Powers the dashboard and Time Machine slider.

Formula: R(t) = exp(-hours_since_access / (S * k * 24))

Target performance: under 1ms for 2,300 chunks.
"""
