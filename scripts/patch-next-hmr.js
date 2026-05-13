#!/usr/bin/env node
// Patches Next.js 16's turbopack HMR message handler to swallow unrecognized
// message errors (like {"event":"ping"}) instead of emitting unhandledRejection.
// The webpack HMR handler already has this try/catch; this brings turbopack in line.

const fs = require('fs')
const path = require('path')

const files = [
  'node_modules/next/dist/server/dev/hot-reloader-turbopack.js',
  'node_modules/next/dist/esm/server/dev/hot-reloader-turbopack.js',
]

const BEFORE = `client.addEventListener('message', async ({ data })=>{
                    const parsedData = JSON.parse(typeof data !== 'string' ? data.toString() : data);`

const AFTER = `client.addEventListener('message', async ({ data })=>{
                    try {
                    const parsedData = JSON.parse(typeof data !== 'string' ? data.toString() : data);`

// Closing marker differs between CJS and ESM (different identifiers after the handler)
const CLOSE_PATTERNS = [
  {
    before: `                    }
                });
                const turbopackConnectedMessage = {
                    type: _hotreloadertypes.HMR_MESSAGE_SENT_TO_BROWSER.TURBOPACK_CONNECTED,`,
    after: `                    }
                    } catch (_) {}
                });
                const turbopackConnectedMessage = {
                    type: _hotreloadertypes.HMR_MESSAGE_SENT_TO_BROWSER.TURBOPACK_CONNECTED,`,
  },
  {
    before: `                    }
                });
                const turbopackConnectedMessage = {
                    type: HMR_MESSAGE_SENT_TO_BROWSER.TURBOPACK_CONNECTED,`,
    after: `                    }
                    } catch (_) {}
                });
                const turbopackConnectedMessage = {
                    type: HMR_MESSAGE_SENT_TO_BROWSER.TURBOPACK_CONNECTED,`,
  },
]

let patched = 0
for (const rel of files) {
  const abs = path.join(__dirname, '..', rel)
  if (!fs.existsSync(abs)) continue
  let src = fs.readFileSync(abs, 'utf8')
  if (src.includes('} catch (_) {}')) {
    console.log(`[patch-next-hmr] already patched: ${rel}`)
    continue
  }
  if (!src.includes(BEFORE)) {
    console.warn(`[patch-next-hmr] pattern not found in ${rel}, skipping`)
    continue
  }
  src = src.replace(BEFORE, AFTER)
  for (const { before, after } of CLOSE_PATTERNS) {
    if (src.includes(before)) {
      src = src.replace(before, after)
      break
    }
  }
  fs.writeFileSync(abs, src)
  console.log(`[patch-next-hmr] patched: ${rel}`)
  patched++
}

if (patched > 0) console.log(`[patch-next-hmr] done (${patched} file(s) patched)`)
