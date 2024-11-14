#!/usr/bin/env node

import { cli } from './lib/cli.js';

cli({
  argv: process.argv,
  cwd: process.cwd(),
});
