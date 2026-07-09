import { writeFileSync } from 'node:fs'
import { renderArt } from '../src/svg/v2/art'
const opts = { seed: 12345, width: 686, height: 300, accent: '#a371f7', bg: '#161b22' }
const out = new URL('../tests/svg/v2/__fixtures__/art-golden.svg', import.meta.url).pathname
writeFileSync(out, renderArt(opts))
console.log('regenerated art-golden.svg')
