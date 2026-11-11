import { runVite } from '../../scripts/lib/vite.mjs'

runVite(['build'], { NPORA_CLOUDFLARE_BUILD: 'true', VITE_DEMO_ENABLED: 'true' })
