
const viteChunksDir = path.join(process.cwd(), 'node_modules', 'vite', 'dist', 'node', 'chunks');

if (fs.existsSync(viteChunksDir)) {
  const files = fs.readdirSync(viteChunksDir);
  for (const file of files) {
    if (file.startsWith('dep-') && file.endsWith('.js')) {
      const filePath = path.join(viteChunksDir, file);
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('exec("net use"')) {
        // Wrap the exec call in a try-catch to prevent EPERM crashes on Windows
        const patchedContent = content.replace(
          /exec\("net use",\s*\(error,\s*stdout\)\s*=>\s*\{/g,
          'try { exec("net use", (error, stdout) => {'
        ).replace(
          /safeRealpathSync = windowsMappedRealpathSync;\s*\}\s*\}\);\s*\}/g,
          'safeRealpathSync = windowsMappedRealpathSync; } }); } catch (e) { safeRealpathSync = fs__default.realpathSync.native; } }'
        );
        
        if (content !== patchedContent) {
          fs.writeFileSync(filePath, patchedContent, 'utf8');
          console.log(`[Patch] Successfully patched Vite EPERM bug in ${file}`);
        }
      }
    }
  }
}
