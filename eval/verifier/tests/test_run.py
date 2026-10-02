"""run.py's job wiring: the plugin snapshot and the per-arm agent configs."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

import run


class SnapshotTest(unittest.TestCase):
    def test_snapshot_is_a_codex_marketplace_holding_the_whole_plugin(self):
        dest = run.snapshot_marketplace(Path(tempfile.mkdtemp()) / "mkt")
        plugin = dest / "plugins" / "terse"
        for rel in ("skills/edit/SKILL.md", "scripts/style-check.mjs", "scripts/style-hook.mjs",
                    "hooks/hooks.json", ".claude-plugin/plugin.json", ".codex-plugin/plugin.json", "package.json"):
            self.assertTrue((plugin / rel).is_file(), rel)
        self.assertTrue(any((plugin / "vendor").rglob("*.wasm")))
        manifest = json.loads((dest / ".agents" / "plugins" / "marketplace.json").read_text())
        self.assertEqual(manifest["plugins"][0]["source"], {"source": "local", "path": "./plugins/terse"})


class ArmAgentTest(unittest.TestCase):
    def setUp(self):
        self.agent, self.host_env = run.load_agent("claude-code", None)

    def test_fragment_comments_stay_out_of_the_config(self):
        self.assertFalse(any(k.startswith("_") for k in self.agent))
        self.assertEqual(self.host_env, {"CLAUDE_FORCE_OAUTH": "true"})

    def test_bare_arm_uses_harbors_agent_with_no_plugin(self):
        config = run.arm_agent(self.agent, "bare", Path("/snap"), None)
        self.assertEqual(config["name"], "claude-code")
        self.assertNotIn("import_path", config)
        self.assertNotIn("terse_marketplace", config["kwargs"])

    def test_terse_arm_uses_the_subclass_and_the_snapshot(self):
        config = run.arm_agent(self.agent, "terse", Path("/snap"), "low")
        self.assertNotIn("name", config)
        self.assertEqual(config["import_path"], "terse_agents:TerseClaudeCode")
        self.assertEqual(config["kwargs"]["terse_marketplace"], "/snap")
        self.assertEqual(config["kwargs"]["reasoning_effort"], "low")

    def test_arms_share_model_and_settings(self):
        bare = run.arm_agent(self.agent, "bare", Path("/snap"), None)
        terse = run.arm_agent(self.agent, "terse", Path("/snap"), None)
        terse_kwargs = {k: v for k, v in terse["kwargs"].items() if k != "terse_marketplace"}
        self.assertEqual((bare["model_name"], bare["kwargs"]), (terse["model_name"], terse_kwargs))

    def test_every_suite_names_existing_tasks(self):
        for suite in sorted((run.EVAL_DIR / "suites").glob("*.json")):
            self.assertTrue(run.load_suite(suite.stem))


if __name__ == "__main__":
    unittest.main()
