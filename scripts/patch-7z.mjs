import { execSync } from 'child_process'
import { existsSync, copyFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const wrapperSrc = join(rootDir, 'scripts', '7za_wrapper.exe')
const wrapperCs = join(rootDir, 'scripts', '7za_wrapper.cs')
const target7za = join(rootDir, 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe')

if (!existsSync(target7za)) {
  console.log('7za.exe not found, skipping patch')
  process.exit(0)
}

if (existsSync(wrapperSrc)) {
  copyFileSync(wrapperSrc, target7za)
  console.log('Patched 7za.exe with symlink-aware wrapper')
} else if (existsSync('C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe')) {
  try {
    execSync(`C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe /nologo /out:"${wrapperSrc}" "${wrapperCs}"`, { stdio: 'inherit' })
    copyFileSync(wrapperSrc, target7za)
    console.log('Compiled and patched 7za.exe with symlink-aware wrapper')
  } catch {
    console.log('Could not compile 7za wrapper, skipping patch')
  }
} else {
  console.log('No pre-built wrapper or CSC found, skipping 7za patch')
  console.log('If electron-builder fails with symlink errors, enable Windows Developer Mode')
}
