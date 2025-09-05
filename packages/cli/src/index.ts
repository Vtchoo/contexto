#!/usr/bin/env node

import ContextoCLI from './ContextoCLI'

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Saindo...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n👋 Saindo...')
  process.exit(0)
})

// Get server URL from environment variable or default
const serverUrl = process.env.CONTEXTO_SERVER_URL || 'http://localhost:3001'

// Create and run CLI
const cli = new ContextoCLI(serverUrl)

cli.run().catch((error) => {
  console.error('Erro fatal:', error.message)
  process.exit(1)
})
