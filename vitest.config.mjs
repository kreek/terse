// Test runner settings. HOME points at an empty folder so a developer's own
// ~/.terse/config.json, their personal voice, never changes a test result.
// The forks pool gives each test file a process that reads this HOME; under
// worker threads, os.homedir() would still return the real one.
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

const home = join(tmpdir(), 'terse-test-home');
mkdirSync(home, { recursive: true });

export default defineConfig({
	test: { pool: 'forks', env: { HOME: home, USERPROFILE: home } },
});
