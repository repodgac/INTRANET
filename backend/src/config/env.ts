import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 3000),
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  jwtSecret: process.env.JWT_SECRET ?? "change-this-secret-in-production",
  databaseUrl: process.env.DATABASE_URL ?? "",
  databaseHost: process.env.DB_HOST ?? "localhost",
  databasePort: Number(process.env.DB_PORT ?? 5432),
  databaseName: process.env.DB_NAME ?? "postgres",
  databaseUser: process.env.DB_USER ?? "postgres",
  databasePassword: process.env.DB_PASSWORD ?? "",
  ldapUrl: process.env.LDAP_URL ?? "",
  ldapBaseDn: process.env.LDAP_BASE_DN ?? "",
  ldapDomain: process.env.LDAP_DOMAIN ?? "",
  ldapBindDn: process.env.LDAP_BIND_DN ?? "",
  ldapBindPassword: process.env.LDAP_BIND_PASSWORD ?? "",
  ldapUserSearchFilter:
    process.env.LDAP_USER_SEARCH_FILTER ??
    "(&(|(mail={{username}})(userPrincipalName={{username}})(sAMAccountName={{accountName}}))(objectClass=person))",
};
