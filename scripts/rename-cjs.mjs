import { renameSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distElectron = join(__dirname, '..', 'dist-electron')

for (const file of readdirSync(distElectron)) {
  if (file.endsWith('.js')) {
    const oldPath = join(distElectron, file)
    const newPath = join(distElectron, file.replace('.js', '.cjs'))
    renameSync(oldPath, newPath)
    console.log(`Renamed ${file} -> ${file.replace('.js', '.cjs')}`)
  }
}
