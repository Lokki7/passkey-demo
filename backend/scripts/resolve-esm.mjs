const EXTENSIONS = [".js"];

export async function resolve(specifier, context, defaultResolve) {
  try {
    return await defaultResolve(specifier, context, defaultResolve);
  } catch (error) {
    const code = error?.code;
    if (code !== "ERR_MODULE_NOT_FOUND" && code !== "ERR_UNSUPPORTED_DIR_IMPORT") {
      throw error;
    }

    const isPathLike =
      specifier.startsWith(".") ||
      specifier.startsWith("/") ||
      specifier.startsWith("file:");
    if (!isPathLike) {
      throw error;
    }

    const candidates = [];
    for (const ext of EXTENSIONS) {
      if (!specifier.endsWith(ext)) {
        candidates.push(`${specifier}${ext}`);
      }
    }
    candidates.push(`${specifier}/index.js`);

    for (const candidate of candidates) {
      try {
        return await defaultResolve(candidate, context, defaultResolve);
      } catch {}
    }

    throw error;
  }
}
