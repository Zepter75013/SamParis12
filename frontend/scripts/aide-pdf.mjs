// Génère le manuel complet de l'espace adhérent au format PDF à partir des chapitres Markdown (src/aide/chapitres/*.md).
//
//   npm run aide:pdf                       →  ../docs/Aide-espace-adherent.pdf
//   npm run aide:pdf -- --out=mon.pdf      →  fichier de sortie au choix
//
// Prérequis : Google Chrome (ou Chromium / Edge) installé sur la machine qui lance la commande. Si Chrome n'est pas
// détecté automatiquement, indiquer son chemin : CHROME_PATH="/chemin/vers/chrome" npm run aide:pdf
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { chapitreNouveautes, parseChapitre } from '../src/aide/render.js'
import { construireDocument } from '../src/aide/document.js'

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dossierChapitres = join(racine, 'src', 'aide', 'chapitres')
const arg = process.argv.find((a) => a.startsWith('--out='))
const sortie = resolve(arg ? arg.slice(6) : join(racine, '..', 'docs', 'Aide-espace-adherent.pdf'))

function trouverChrome() {
  const candidats = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean)
  return candidats.find((c) => existsSync(c))
}

const chrome = trouverChrome()
if (!chrome) {
  console.error("Chrome est introuvable. Installe Google Chrome, ou indique son chemin : CHROME_PATH=\"/chemin/vers/chrome\" npm run aide:pdf")
  process.exit(1)
}

const { CHANGELOG, APP_VERSION } = await import(pathToFileURL(join(racine, 'src', 'version.js')).href)
const chapitres = [
  ...readdirSync(dossierChapitres).filter((f) => f.endsWith('.md')).sort()
    .map((f) => parseChapitre(readFileSync(join(dossierChapitres, f), 'utf-8'), f)),
  chapitreNouveautes(CHANGELOG),
].sort((a, b) => a.ordre - b.ordre)

const css = readFileSync(join(racine, 'src', 'aide', 'aide.css'), 'utf-8')
const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const corps = construireDocument(chapitres, { titre: "Aide de l'espace adhérent", sousTitre: "Club d'athlétisme SAM Paris 12", version: APP_VERSION, date })

const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Aide de l'espace adhérent — SAM Paris 12</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Spectral:ital,wght@0,400;0,500;0,600;1,400&display=swap">
<style>body{margin:0}${css}</style></head><body><div class="aide-doc">${corps}</div></body></html>`

const tmp = mkdtempSync(join(tmpdir(), 'aide-'))
const page = join(tmp, 'aide.html')
writeFileSync(page, html, 'utf-8')
mkdirSync(dirname(sortie), { recursive: true })

const r = spawnSync(chrome, [
  '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--no-sandbox',
  '--virtual-time-budget=8000', `--print-to-pdf=${sortie}`, pathToFileURL(page).href,
], { stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf-8' })
rmSync(tmp, { recursive: true, force: true })

if (!existsSync(sortie)) {
  console.error('La génération du PDF a échoué.\n' + (r.stderr || ''))
  process.exit(1)
}
console.log(`PDF généré : ${sortie}\n${chapitres.length} chapitres · version ${APP_VERSION}`)
