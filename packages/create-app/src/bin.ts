#!/usr/bin/env node

import { run } from './lib/bin.js';

try {
  await run();
} catch (error) {
  console.error('Error', error);
  process.exit(1);
}
