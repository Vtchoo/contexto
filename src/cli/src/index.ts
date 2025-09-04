#!/usr/bin/env node

import * as dotenv from 'dotenv';
import * as readline from 'readline';
import { ContextoCLI } from './ContextoCLI';
import { sleep } from './utils';

// Load environment variables
dotenv.config();


async function main() {
  const args = process.argv.slice(2);
  const isDemo = args.includes('--demo') || args.includes('-d');
  
  if (isDemo) {
    console.log('🎯 Demo mode requested, but full CLI is available.\n');
    console.log('💡 To test without server: Set API_URL to a test server or start local server\n');
  }
  
  const cli = new ContextoCLI();
  await cli.start();
}

main().catch(console.error);
