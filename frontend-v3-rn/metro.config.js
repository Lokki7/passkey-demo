const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Better Auth uses package exports; enable resolver support in Metro.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
