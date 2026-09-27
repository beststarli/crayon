export type ServerConfig = {
  databaseUrl: string;
  accessSecret: string;
  refreshSecret: string;
  rustfsEndpoint?: string;
  rustfsRegion: string;
  rustfsBucket?: string;
  rustfsAccessKey?: string;
  rustfsSecretKey?: string;
};

export function getServerConfig(): ServerConfig {
  return {
    databaseUrl: process.env.DATABASE_URL ?? "",
    accessSecret: process.env.ACCESS_TOKEN_SECRET ?? "dev-access-secret-change-me",
    refreshSecret: process.env.REFRESH_TOKEN_SECRET ?? "dev-refresh-secret-change-me",
    rustfsEndpoint: process.env.RUSTFS_ENDPOINT,
    rustfsRegion: process.env.RUSTFS_REGION ?? "us-east-1",
    rustfsBucket: process.env.RUSTFS_BUCKET,
    rustfsAccessKey: process.env.RUSTFS_ACCESS_KEY,
    rustfsSecretKey: process.env.RUSTFS_SECRET_KEY,
  };
}

export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function storageConfigured() {
  const c = getServerConfig();
  return Boolean(c.rustfsEndpoint && c.rustfsBucket && c.rustfsAccessKey && c.rustfsSecretKey);
}
