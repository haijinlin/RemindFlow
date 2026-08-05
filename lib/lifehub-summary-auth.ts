export function lifeHubSummaryIsConfigured() {
  return Boolean(process.env.LIFEHUB_SUMMARY_SECRET?.trim());
}

export async function hasValidLifeHubSummaryRequest(request: Request) {
  const expected = process.env.LIFEHUB_SUMMARY_SECRET?.trim();
  const authorization = request.headers.get("authorization");
  const candidate = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
  if (!expected || !candidate) return false;

  const encoder = new TextEncoder();
  const [candidateHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(candidate)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const left = new Uint8Array(candidateHash);
  const right = new Uint8Array(expectedHash);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}
