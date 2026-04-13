/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'renderer-to-main',
      severity: 'error',
      from: { path: '^src' },
      to: {
        path: '^electron',
      },
    },
    {
      name: 'main-to-renderer',
      severity: 'error',
      from: { path: '^electron' },
      to: {
        path: '^src',
      },
    },
    {
      name: 'shared-must-not-depend-on-app',
      severity: 'error',
      from: { path: '^shared' },
      to: {
        path: '^(src|electron)',
      },
    },
  ],
  options: {
    tsPreCompilationDeps: true,
    doNotFollow: { path: 'node_modules' },
    includeOnly: '^((src|electron|shared)/)',
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
      extensions: ['.ts', '.tsx', '.js', '.cjs', '.mjs'],
      mainFields: ['types', 'module', 'main'],
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/[^/]+',
      },
    },
  },
}
