import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts', 'src/validate-cli.ts', 'src/validate-env-cli.ts', 'src/validate-config-cli.ts', 'src/vercel-adapter.ts', 'src/vercel-prebuild.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  shims: true,
  external: ['@coordinated/phase-client']
})