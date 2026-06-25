import { Client } from "ldapts";
import { env } from "../config/env";

interface AuthenticatedLdapUser {
  username: string;
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function escapeLdapFilter(value: string) {
  return value.replace(/\\/g, "\\5c").replace(/\*/g, "\\2a").replace(/\(/g, "\\28").replace(/\)/g, "\\29").replace(/\0/g, "\\00");
}

function buildCandidateUsernames(username: string) {
  const normalizedUsername = normalizeUsername(username);
  const candidates = [normalizedUsername];

  if (!normalizedUsername.includes("@") && env.ldapDomain) {
    candidates.unshift(`${normalizedUsername}@${env.ldapDomain.toLowerCase()}`);
  }

  return [...new Set(candidates)];
}

function buildSearchFilter(username: string) {
  const normalizedUsername = normalizeUsername(username);
  const accountName = normalizedUsername.split("@")[0];

  return env.ldapUserSearchFilter
    .replaceAll("{{username}}", escapeLdapFilter(normalizedUsername))
    .replaceAll("{{accountName}}", escapeLdapFilter(accountName));
}

export function isLdapEnabled() {
  return Boolean(env.ldapUrl.trim() && env.ldapBaseDn.trim());
}

export async function authenticateWithLdap(username: string, password: string): Promise<AuthenticatedLdapUser | null> {
  if (!isLdapEnabled()) {
    return null;
  }

  const normalizedUsername = normalizeUsername(username);
  const client = new Client({
    url: env.ldapUrl,
    timeout: 5000,
    connectTimeout: 5000,
  });

  try {
    if (env.ldapBindDn && env.ldapBindPassword) {
      const userDn = await resolveUserDn(client, normalizedUsername);

      if (!userDn) {
        return null;
      }

      await client.bind(userDn, password);

      return { username: normalizedUsername };
    }

    const candidates = buildCandidateUsernames(normalizedUsername);

    for (const candidate of candidates) {
      try {
        await client.bind(candidate, password);
        return { username: normalizedUsername };
      } catch {
        continue;
      }
    }

    return null;
  } catch {
    return null;
  } finally {
    await client.unbind().catch(() => undefined);
  }
}

async function resolveUserDn(client: Client, username: string) {
  await client.bind(env.ldapBindDn, env.ldapBindPassword);

  const { searchEntries } = await client.search(env.ldapBaseDn, {
    scope: "sub",
    filter: buildSearchFilter(username),
    sizeLimit: 1,
    attributes: ["dn"],
  });

  const match = searchEntries[0];
  return match?.dn?.toString() ?? null;
}
