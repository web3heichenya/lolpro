export function getRendererPlatform(): 'darwin' | 'win32' | 'linux' {
  if (process.platform === 'darwin') return 'darwin'
  if (process.platform === 'win32') return 'win32'
  return 'linux'
}
