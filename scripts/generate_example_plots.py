"""Regenerate the on-brand example plots referenced by the README.

These plots are genuine library output, so they are produced by
``Project.plot()`` with the Planaco theme applied (see ``planaco.style`` and
``brand/STYLE_GUIDE.md``). Runs are seeded for reproducibility.

Usage (from the repo root)::

    python scripts/generate_example_plots.py

Regenerates:
    example/monte_carlo_estimation.png   (histogram, gold mode bar + P50/P85/P95)
    example/monte_carlo_cumulative.png   (cumulative distribution)
    example/project_dependency_graph.png (dependency DAG, brand colors)
"""

import random
from pathlib import Path

from planaco import Project, Task

SEED = 42
N = 10000
EXAMPLE_DIR = Path(__file__).resolve().parent.parent / "example"


def build_project() -> Project:
    """Build the README "App Development" example project."""
    project = Project(name="App Development", unit="days")

    design_ui = Task(
        name="Design UI", min_duration=1, max_duration=3, estimator="uniform"
    )
    develop_frontend = Task(
        name="Develop frontend", min_duration=7, max_duration=14, estimator="uniform"
    )
    develop_backend = Task(
        name="Develop backend", min_duration=5, max_duration=10, estimator="uniform"
    )
    test_frontend = Task(
        name="Test frontend", min_duration=1, max_duration=3, estimator="uniform"
    )
    test_backend = Task(
        name="Test backend", min_duration=2, max_duration=4, estimator="uniform"
    )
    uat = Task(
        name="User Acceptance Testing",
        min_duration=2,
        max_duration=5,
        estimator="uniform",
    )
    release_app = Task(
        name="Release app", min_duration=1, max_duration=2, estimator="uniform"
    )
    deploy_backend = Task(
        name="Deploy backend", min_duration=1, max_duration=1.5, estimator="uniform"
    )
    go_live = Task(
        name="Go live", min_duration=0.25, max_duration=0.75, estimator="uniform"
    )

    project.add_task(design_ui)
    project.add_task(develop_frontend, depends_on=[design_ui])
    project.add_task(develop_backend)
    project.add_task(test_frontend, depends_on=[develop_frontend])
    project.add_task(test_backend, depends_on=[develop_backend])
    project.add_task(uat, depends_on=[test_frontend, test_backend])
    project.add_task(release_app, depends_on=[uat])
    project.add_task(deploy_backend, depends_on=[uat])
    project.add_task(go_live, depends_on=[deploy_backend])

    return project


def main() -> None:
    project = build_project()

    # Histogram with percentile markers.
    random.seed(SEED)
    hist = project.plot(n=N, hist=True, show_percentiles=True, percentiles=[50, 85, 95])
    hist.save(str(EXAMPLE_DIR / "monte_carlo_estimation.svg"))
    hist.save(str(EXAMPLE_DIR / "monte_carlo_estimation.png"))

    # Cumulative distribution.
    random.seed(SEED)
    cumulative = project.plot(n=N, hist=False)
    cumulative.save(str(EXAMPLE_DIR / "monte_carlo_cumulative.svg"))
    cumulative.save(str(EXAMPLE_DIR / "monte_carlo_cumulative.png"))

    # Dependency graph.
    graph = project.plot_dependency_graph()
    graph.save(str(EXAMPLE_DIR / "project_dependency_graph.svg"))
    graph.save(str(EXAMPLE_DIR / "project_dependency_graph.png"))

    print(f"Regenerated example plots (svg + png) in {EXAMPLE_DIR}")


if __name__ == "__main__":
    main()
