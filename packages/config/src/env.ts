// Environment configuration utilities
// Placeholder for Phase.dev integration and environment variable management

export const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value || defaultValue!;
};

export const getOptionalEnvVar = (key: string, defaultValue?: string): string | undefined => {
  return process.env[key] || defaultValue;
};