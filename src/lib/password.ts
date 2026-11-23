import bcrypt from "bcryptjs";

let dummyHash: string | null = null;

async function dummyPasswordHash() {
  if (!dummyHash) dummyHash = await bcrypt.hash("cabinet-dummy-password", 12);
  return dummyHash;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function checkPassword(password: string, passwordHash: string | null) {
  const hash = passwordHash ?? (await dummyPasswordHash());
  const matches = await bcrypt.compare(password, hash);
  return Boolean(passwordHash) && matches;
}
