// Installed default: the whole harness lint layer. Retrofitting into an existing
// flat config? Spread it instead: `export default [...harnessEslint(), ...yourBlocks]`.
import harnessEslint from './eslint/harness.eslint.mjs'

export default harnessEslint()
