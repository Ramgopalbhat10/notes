#!/usr/bin/env node

import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const staged = args.includes('--staged')
const baseArg = args.find((arg) => arg.startsWith('--base='))
const headArg = args.find((arg) => arg.startsWith('--head='))

const base = baseArg ? baseArg.slice('--base='.length) : null
const head = headArg ? headArg.slice('--head='.length) : 'HEAD'

const ALLOWED_BRANCH_PREFIXES = ['feature/', 'fix/', 'refactor/', 'chore/', 'docs/']

function run(command) {
  return execSync(command, { encoding: 'utf8' }).trim()
}

function fail(message, details = []) {
  console.error(`\n❌ ${message}`)
  if (details.length > 0) {
    for (const detail of details) {
      console.error(`   - ${detail}`)
    }
  }
  process.exit(1)
}

function pass(message, details = []) {
  console.log(`✅ ${message}`)
  if (details.length > 0) {
    for (const detail of details) {
      console.log(`   - ${detail}`)
    }
  }
}

function getChangedFiles() {
  if (staged) {
    const output = run('git diff --cached --name-only --diff-filter=ACMR')
    return output ? output.split('\n').filter(Boolean) : []
  }

  const targetBase = base ?? 'origin/main'
  try {
    const output = run(`git diff --name-only --diff-filter=ACMR ${targetBase}...${head}`)
    return output ? output.split('\n').filter(Boolean) : []
  } catch {
    if (!base) {
      const fallback = run(`git diff --name-only --diff-filter=ACMR main...${head}`)
      return fallback ? fallback.split('\n').filter(Boolean) : []
    }

    fail('Unable to compute changed files from the supplied base/head refs.', [
      `base=${targetBase}`,
      `head=${head}`,
      'Ensure the base ref exists locally (for CI, fetch with full history).',
    ])
  }

  return []
}

function isDocumentationOnly(filePath) {
  return (
    filePath.startsWith('docs/') ||
    filePath.startsWith('.github/') ||
    filePath.endsWith('.md') ||
    filePath === 'AGENTS.md'
  )
}

function hasForbiddenTestFile(filePath) {
  return /(^|\/)__tests__(\/|$)/.test(filePath) || /\.(test|spec)\.[^/]+$/.test(filePath)
}

function validateProgressFile() {
  const progressPath = 'docs/PROGRESS.md'
  let content = ''

  try {
    content = readFileSync(progressPath, 'utf8')
  } catch {
    fail('Required file docs/PROGRESS.md is missing.')
  }

  const requiredSections = [
    /^Current (story|issue):\s+`docs\/(stories|issues)\/.+`/m,
    /^Current section:\s+.+/m,
    /^Previous tasks \(latest completed batch only\):/m,
    /^Next tasks:/m,
    /^Notes:/m,
  ]

  const missing = requiredSections.filter((pattern) => !pattern.test(content))
  if (missing.length > 0) {
    fail('docs/PROGRESS.md does not match the required workflow structure.', [
      'Expected: Current story/issue, Current section, Previous tasks, Next tasks, Notes.',
    ])
  }
}

const changedFiles = getChangedFiles()

if (changedFiles.length === 0) {
  pass('Workflow documentation gate passed (no changed files detected).')
  process.exit(0)
}

const forbiddenTestFiles = changedFiles.filter(hasForbiddenTestFile)
if (forbiddenTestFiles.length > 0) {
  fail('Test files are not allowed in this repository.', forbiddenTestFiles)
}

const implementationFiles = changedFiles.filter((filePath) => !isDocumentationOnly(filePath))
if (implementationFiles.length === 0) {
  pass('Workflow documentation gate passed (docs-only changes detected).', [
    'No implementation files changed, so workflow documentation linkage is not required.',
  ])
  process.exit(0)
}

const currentBranch = run('git branch --show-current')
if (!ALLOWED_BRANCH_PREFIXES.some((prefix) => currentBranch.startsWith(prefix))) {
  fail('Current branch prefix is invalid for implementation work.', [
    `branch=${currentBranch}`,
    'Allowed prefixes: feature/, fix/, refactor/, chore/, docs/',
  ])
}

const hasProgressChange = changedFiles.includes('docs/PROGRESS.md')
if (!hasProgressChange) {
  fail('Implementation changes require docs/PROGRESS.md updates.')
}

validateProgressFile()

const touchedStoryFiles = changedFiles.filter((filePath) => /^docs\/stories\/story-\d+\.md$/.test(filePath))
const touchedIssueFiles = changedFiles.filter((filePath) => /^docs\/issues\/issue-\d+\.md$/.test(filePath))

if (touchedStoryFiles.length === 0 && touchedIssueFiles.length === 0) {
  fail('Implementation changes must update a story or issue document.', [
    'Expected at least one of:',
    'docs/stories/story-<N>.md',
    'docs/issues/issue-<N>.md',
  ])
}

if (touchedStoryFiles.length > 0 && !changedFiles.includes('docs/stories/README.md')) {
  fail('Story updates must include docs/stories/README.md index updates.')
}

if (touchedIssueFiles.length > 0 && !changedFiles.includes('docs/issues/README.md')) {
  fail('Issue updates must include docs/issues/README.md index updates.')
}

pass('Workflow documentation gate passed for implementation changes.', [
  `Implementation files checked: ${implementationFiles.length}`,
  `Story docs touched: ${touchedStoryFiles.length}`,
  `Issue docs touched: ${touchedIssueFiles.length}`,
])
