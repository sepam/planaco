"""Ensure code examples in README.md stay in sync with the actual API.

Extracts fenced ``python`` and ``yaml`` code blocks from README.md and
executes them, so a README example that no longer matches the library
fails the test suite instead of failing for a new user.
"""

import re
from pathlib import Path

import pytest

from planaco.config import build_project_from_config, load_config

README_PATH = Path(__file__).resolve().parent.parent / "README.md"


def _extract_code_blocks(language):
    """Return the contents of all fenced code blocks for a language."""
    text = README_PATH.read_text(encoding="utf-8")
    pattern = re.compile(rf"```{language}\n(.*?)```", re.DOTALL)
    return pattern.findall(text)


def test_readme_python_examples_run(tmp_path, monkeypatch):
    """All Python examples must run in order without errors.

    Blocks are executed cumulatively in a shared namespace because later
    examples build on objects defined in earlier ones (e.g. ``project``).
    """
    monkeypatch.chdir(tmp_path)  # exported files land in a temp dir
    blocks = _extract_code_blocks("python")
    assert blocks, "No Python code blocks found in README.md"

    namespace = {}
    for i, block in enumerate(blocks, start=1):
        try:
            exec(compile(block, f"README.md python block {i}", "exec"), namespace)
        except Exception as e:
            pytest.fail(
                f"README.md python block {i} raised {type(e).__name__}: {e}\n"
                f"---\n{block}---"
            )


def test_readme_yaml_examples_load(tmp_path):
    """All YAML project examples must pass config validation and simulate."""
    blocks = [b for b in _extract_code_blocks("yaml") if "project:" in b]
    assert blocks, "No YAML project config blocks found in README.md"

    for i, block in enumerate(blocks, start=1):
        config_file = tmp_path / f"readme_example_{i}.yaml"
        config_file.write_text(block, encoding="utf-8")
        try:
            config = load_config(str(config_file))
            project = build_project_from_config(config)
            project.statistics(n=100)
        except Exception as e:
            pytest.fail(
                f"README.md yaml block {i} raised {type(e).__name__}: {e}\n"
                f"---\n{block}---"
            )
