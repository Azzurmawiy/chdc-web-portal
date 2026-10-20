import { spawnSync, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { delimiter, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const venvPython = process.platform === 'win32'
  ? join(root, 'backend', '.venv', 'Scripts', 'python.exe')
  : join(root, 'backend', '.venv', 'bin', 'python')
const candidates = [
  process.env.PYTHON,
  venvPython,
  ...(process.platform === 'win32' ? ['py', 'python'] : ['python3', 'python']),
].filter(Boolean)

const python = candidates.find((candidate) => {
  if (candidate.includes('/') || candidate.includes('\\')) return existsSync(candidate)
  return spawnSync(candidate, ['--version'], { stdio: 'ignore' }).status === 0
})

if (!python) {
  console.error('Python was not found. Create backend/.venv or set the PYTHON environment variable.')
  process.exit(1)
}

const server = spawn(python, ['backend/manage.py', 'runserver', '0.0.0.0:8000'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, PATH: `${join(root, 'backend', '.venv', 'bin')}${delimiter}${process.env.PATH ?? ''}` },
})

server.on('error', (error) => {
  console.error(`Unable to start Django: ${error.message}`)
  process.exitCode = 1
})
server.on('exit', (code, signal) => {
  process.exitCode = signal ? 1 : (code ?? 1)
})