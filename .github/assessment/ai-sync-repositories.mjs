import {
  constants,
  createCipheriv,
  createHash,
  createPrivateKey,
  publicEncrypt,
  randomBytes,
  sign,
} from 'node:crypto';

const REPOSITORY = 'stripe/ai';
const REPOSITORY_ID = '886826524';
const REVIEWED_BASE = '72e7e79e08e245063e87d61f60340e55e54c68f4';
const NONCE = '5136c291a91a6d948435740a';
const REF = 'refs/heads/assessment/ai-sync-repositories-20261118-5136c291a91a';
const WORKFLOW_REF = `${REPOSITORY}/.github/workflows/sync-skills.yml@${REF}`;
const EXPECTED_APP_ID = 3636332;
const EXPECTED_CLIENT_ID_SHA256 = '0b302a82b5a2597949d1a3202f29f0e6913ec76d4591e079b6f28334420e6ab2';
const EXPECTED_OWNER = 'stripe';
const EXPECTED_OWNER_ID = 856813;
const EXPECTED_INSTALLATION_ID_SHA256 = '82e20f6d6378f6fbbb10678187d3de0626c1001287e4e612a17d12e604915d87';
const MAX_PAGES = 100;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_RESULT_RECORD_BYTES = 7 * 1024 * 1024;
const MAX_RESULT_BYTES = 8 * 1024 * 1024;
const COLLECTION_MS = 300000;
const CHUNK_SIZE = 24000;
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEAwLA+ryb7dIM3mnevGNme
aHiY7H0Ad+3w5PhUDq0yjRhDk4Tba1+nnCXqJ1xIoMVkDVP4MsXJ4XwXHZWlkkog
NEDwYhx7wI4nsbsffUwe+YttRfyNjDxFymQFOqE3GSG5RyHviN+ZoxrfE8CtlGj3
b0sIh4RVj0wa/9BXInmRd1FR0cfiqLtxpto8GI6DaJw2Y4zx0VdceeH/u0g7Xtob
Vy4Lb9kPFfcovc84dKmXMBVInO1qp6b/48PERPTjwyi0G4MwQnpWJTIdgf3aTD5Q
gHDFSmJocSR09aPvjBcp7Q99tN1piwjMuU9CMbEcQC9qifpF25J4kAhUkhsjBt8J
m2MdV8vLW9D5lKF8MR1FTE4Ko0p/hzVPHIhwf/tn5teYMa5Bivhiq8OKVeALb44H
kysgdyf1JhlZAfK0fnMjsqsFHTmJljkb4ISV5SCAf9ufcRUxk5yfSrE9or1aCi0W
3FLAr07jkIULqvArrw4wlvEvXqNMQAWSfkYQXrBR6jyrAgMBAAE=
-----END PUBLIC KEY-----`;

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const safeString = (value, limit = 160) => typeof value === 'string' ? value.slice(0, limit) : null;
const safeId = (value) => Number.isSafeInteger(value) && value > 0 ? value : null;

function assertContext() {
  const expected = process.env.EXPECTED_SHA ?? '';
  if (!/^[0-9a-f]{40}$/.test(expected)
      || process.env.GITHUB_REPOSITORY !== REPOSITORY
      || process.env.GITHUB_REPOSITORY_ID !== REPOSITORY_ID
      || process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch'
      || process.env.GITHUB_REF !== REF
      || process.env.GITHUB_SHA !== expected
      || process.env.GITHUB_WORKFLOW_SHA !== expected
      || process.env.GITHUB_WORKFLOW_REF !== WORKFLOW_REF) throw new Error('context');
  return expected;
}

function jwt(clientId, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({ iat: now - 30, exp: now + 300, iss: clientId })).toString('base64url');
  const unsigned = `${header}.${claims}`;
  return `${unsigned}.${sign('RSA-SHA256', Buffer.from(unsigned), privateKey).toString('base64url')}`;
}

function expectedOwner(value) {
  return safeId(value?.id) === EXPECTED_OWNER_ID
    && value?.login === EXPECTED_OWNER && value?.type === 'Organization';
}

function normalizedPermissions(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([key, permission]) => /^[a-z][a-z0-9_-]{0,79}$/.test(key)
      && ['none', 'read', 'write', 'admin'].includes(permission))
    .sort(([a], [b]) => a.localeCompare(b)));
}

function metadataOnly(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && value.metadata === 'read'
    && Object.entries(value).every(([name, permission]) => name === 'metadata' ? permission === 'read' : permission === 'none');
}

function repositoryMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || safeId(value.id) === null || !expectedOwner(value.owner)
      || typeof value.full_name !== 'string'
      || !/^stripe\/[A-Za-z0-9_.-]{1,100}$/.test(value.full_name)) return null;
  const permissions = value.permissions && typeof value.permissions === 'object'
    && !Array.isArray(value.permissions) ? value.permissions : {};
  return {
    id: value.id,
    full_name: value.full_name,
    permissions: Object.fromEntries(Object.entries(permissions)
      .filter(([key, permission]) => /^[a-z][a-z0-9_]{0,39}$/.test(key) && typeof permission === 'boolean')
      .sort(([a], [b]) => a.localeCompare(b))),
  };
}

function requestAllowed(method, path, verifiedInstallationId) {
  if (method === 'GET' && (path === '/app' || path === '/orgs/stripe/installation')) return true;
  if (method === 'POST') return verifiedInstallationId !== null
    && path === `/app/installations/${verifiedInstallationId}/access_tokens`;
  if (method === 'GET') return /^\/installation\/repositories\?per_page=100&page=([1-9][0-9]?|100)$/.test(path);
  return method === 'DELETE' && path === '/installation/token';
}

async function request(method, path, authorization, route, deadline, verifiedInstallationId = null, body = undefined) {
  if (!requestAllowed(method, path, verifiedInstallationId)) throw new Error('route');
  if (method === 'POST' && JSON.stringify(body) !== '{"permissions":{"metadata":"read"}}') throw new Error('body');
  const record = { method, route, status: null, request_id: null, transport: 'ok' };
  if (Date.now() >= deadline) { record.transport = 'deadline'; return { record, parsed: null }; }
  try {
    const response = await fetch(`https://api.github.com${path}`, {
      method,
      redirect: 'error',
      signal: AbortSignal.timeout(Math.max(1, Math.min(10000, deadline - Date.now()))),
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${authorization}`,
        'x-github-api-version': '2022-11-28',
        'user-agent': 'assessment-repository-metadata',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    record.status = response.status;
    record.request_id = safeString(response.headers.get('x-github-request-id'));
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body ?? []) {
      size += chunk.byteLength;
      if (size > MAX_RESPONSE_BYTES) throw new Error('size');
      chunks.push(Buffer.from(chunk));
    }
    const bytes = Buffer.concat(chunks);
    let parsed = null;
    if (response.status === 200 || response.status === 201) {
      try { parsed = JSON.parse(bytes.toString('utf8')); }
      catch { record.transport = 'invalid_json'; }
    }
    bytes.fill(0);
    return { record, parsed };
  } catch {
    record.transport = 'request_failed';
    return { record, parsed: null };
  }
}

function recordRequest(report, record) {
  const size = Buffer.byteLength(JSON.stringify(record));
  if (report.record_bytes + size > MAX_RESULT_RECORD_BYTES) {
    report.result = 'metadata_collection_incomplete';
    report.incomplete_reason = 'result_size_limit';
    return false;
  }
  report.record_bytes += size;
  report.requests.push(record);
  return true;
}

async function collect(report) {
  report.commit = assertContext();
  const clientId = process.env.GH_APP_STRIPE_AI_SYNC_CLIENT_ID ?? '';
  const pem = process.env.GH_APP_STRIPE_AI_SYNC_PEM ?? '';
  if (sha256(clientId) !== EXPECTED_CLIENT_ID_SHA256 || !pem) throw new Error('credentials');
  const privateKey = createPrivateKey(pem);
  if (privateKey.asymmetricKeyType !== 'rsa') throw new Error('key_type');
  const deadline = Date.now() + COLLECTION_MS;
  const app = await request('GET', '/app', jwt(clientId, privateKey), 'authenticated_app', deadline);
  recordRequest(report, app.record);
  if (app.record.status !== 200 || safeId(app.parsed?.id) !== EXPECTED_APP_ID
      || app.parsed?.client_id !== clientId || !expectedOwner(app.parsed?.owner)) {
    report.result = 'app_identity_not_bound';
    return;
  }
  report.app_identity_bound = true;

  const installation = await request('GET', '/orgs/stripe/installation', jwt(clientId, privateKey), 'stripe_installation', deadline);
  recordRequest(report, installation.record);
  const installationId = safeId(installation.parsed?.id);
  if (installation.record.status !== 200 || installationId === null
      || sha256(String(installationId)) !== EXPECTED_INSTALLATION_ID_SHA256
      || safeId(installation.parsed?.app_id) !== EXPECTED_APP_ID
      || !expectedOwner(installation.parsed?.account)
      || installation.parsed?.suspended_at !== null) {
    report.result = 'installation_identity_not_bound';
    return;
  }
  report.installation_identity_bound = true;

  let token = null;
  try {
    report.token_mint_attempts = 1;
    const minted = await request('POST', `/app/installations/${installationId}/access_tokens`, jwt(clientId, privateKey), 'create_metadata_token', deadline, installationId, { permissions: { metadata: 'read' } });
    recordRequest(report, minted.record);
    if (typeof minted.parsed?.token === 'string' && minted.parsed.token.length > 0) token = minted.parsed.token;
    if (minted.parsed && typeof minted.parsed === 'object') delete minted.parsed.token;
    if (minted.record.status !== 201 || token === null) {
      report.result = 'token_mint_unconfirmed';
      report.token_mint_indeterminate = minted.record.transport !== 'ok' || minted.record.status === null
        || minted.record.status === 201 || minted.record.status >= 500;
      return;
    }
    report.token_created = true;
    report.token_expires_at = safeString(minted.parsed?.expires_at, 64);
    const granted = normalizedPermissions(minted.parsed?.permissions);
    report.token_permissions = granted;
    if (!metadataOnly(minted.parsed?.permissions)) {
      report.result = 'token_permissions_not_bound';
      return;
    }
    report.token_permissions_bound = true;

    const seen = new Set();
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const result = await request('GET', `/installation/repositories?per_page=100&page=${page}`, token, 'installation_repositories', deadline, installationId);
      const values = result.parsed?.repositories;
      const totalCount = result.parsed?.total_count;
      if (!recordRequest(report, { ...result.record, page })) return;
      if (result.record.status !== 200 || !Array.isArray(values) || values.length > 100
          || !Number.isSafeInteger(totalCount) || totalCount < 0) {
        report.result = 'metadata_collection_incomplete';
        report.incomplete_reason = Date.now() >= deadline ? 'deadline' : 'repository_page_failed';
        return;
      }
      if (report.reported_total_count === null) report.reported_total_count = totalCount;
      else if (report.reported_total_count !== totalCount) report.pagination_count_changed = true;
      for (const value of values) {
        const repository = repositoryMetadata(value);
        if (repository === null) { report.omitted_repository_count += 1; continue; }
        if (seen.has(repository.id)) { report.duplicate_repository_count += 1; continue; }
        const bytes = Buffer.byteLength(JSON.stringify(repository));
        if (report.record_bytes + bytes > MAX_RESULT_RECORD_BYTES) {
          report.result = 'metadata_collection_incomplete';
          report.incomplete_reason = 'result_size_limit';
          return;
        }
        report.record_bytes += bytes;
        seen.add(repository.id);
        report.repositories.push(repository);
      }
      if (values.length < 100) {
        report.enumeration_complete = report.omitted_repository_count === 0 && report.duplicate_repository_count === 0
          && !report.pagination_count_changed && report.repositories.length === report.reported_total_count;
        report.result = report.enumeration_complete ? 'metadata_collection_completed' : 'metadata_collection_incomplete';
        if (!report.enumeration_complete) report.incomplete_reason = 'repository_page_inconsistent';
        return;
      }
    }
    report.result = 'metadata_collection_incomplete';
    report.incomplete_reason = 'repository_page_limit';
  } finally {
    if (token !== null) {
      report.token_revocation_attempted = true;
      const cleanupDeadline = Date.now() + 30000;
      let ambiguousRevoke = false;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const revoked = await request('DELETE', '/installation/token', token, 'revoke_metadata_token', cleanupDeadline, installationId);
        const record = { ...revoked.record, attempt };
        report.token_revocation_attempts.push(record);
        report.token_revocation = record;
        if (record.status === 204) {
          report.token_revoked = true;
          report.token_cleanup_state = 'revoked';
          break;
        }
        if (record.status === 401 && ambiguousRevoke) {
          report.token_unusable = true;
          report.token_cleanup_state = 'unusable_after_ambiguous_revoke';
          break;
        }
        if (record.transport === 'ok' && record.status !== null && record.status < 500) break;
        ambiguousRevoke = true;
      }
      if (report.token_cleanup_state === 'not_attempted') report.token_cleanup_state = 'unconfirmed';
      if (!report.token_revoked) {
        report.result = 'metadata_collection_incomplete';
        report.incomplete_reason = report.token_unusable
          ? 'token_unusable_without_confirmed_revocation' : 'token_revocation_not_confirmed';
      }
      token = null;
    }
  }
}

function emitEncrypted(report) {
  let plaintext = Buffer.from(JSON.stringify(report));
  if (plaintext.length > MAX_RESULT_BYTES) {
    plaintext.fill(0);
    plaintext = Buffer.from(JSON.stringify({
      ...binding(),
      commit: report.commit ?? null,
      observed_at: report.observed_at,
      result: 'metadata_collection_incomplete',
      incomplete_reason: 'result_size_limit',
      app_identity_bound: report.app_identity_bound,
      installation_identity_bound: report.installation_identity_bound,
      token_mint_attempts: report.token_mint_attempts,
      token_created: report.token_created,
      token_expires_at: report.token_expires_at,
      token_mint_indeterminate: report.token_mint_indeterminate,
      token_permissions_bound: report.token_permissions_bound,
      token_permissions: report.token_permissions ?? {},
      token_revocation_attempted: report.token_revocation_attempted,
      token_revocation_attempts: report.token_revocation_attempts,
      token_revoked: report.token_revoked,
      token_unusable: report.token_unusable,
      token_cleanup_state: report.token_cleanup_state,
      token_revocation: report.token_revocation,
      enumeration_complete: false,
      reported_total_count: report.reported_total_count,
      source_reads: false,
      repository_writes: false,
      other_installations_contacted: false,
      corporate_host_requests: false,
      requests: [],
      repositories: [],
    }));
  }
  if (plaintext.length > MAX_RESULT_BYTES) throw new Error('result_size');
  const key = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  plaintext.fill(0);
  if (ciphertext.length > MAX_RESULT_BYTES) throw new Error('ciphertext_size');
  const wrappedKey = publicEncrypt({ key: PUBLIC_KEY, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, key);
  const encoded = ciphertext.toString('base64');
  const envelope = {
    schema: 'assessment-encrypted-metadata-v1',
    algorithm: 'RSA-OAEP-SHA256+AES-256-GCM',
    wrapped_key: wrappedKey.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext_sha256: sha256(ciphertext),
    chunks: Math.ceil(encoded.length / CHUNK_SIZE),
  };
  key.fill(0);
  process.stdout.write(`ASSESSMENT_ENVELOPE ${JSON.stringify(envelope)}\n`);
  for (let offset = 0; offset < encoded.length; offset += CHUNK_SIZE) process.stdout.write(`ASSESSMENT_CIPHERTEXT ${encoded.slice(offset, offset + CHUNK_SIZE)}\n`);
  process.stdout.write('ASSESSMENT_SUCCESS\n');
}

function binding() {
  return {
    schema: 'stripe-ai-installation-repositories-v1',
    nonce: NONCE,
    reviewed_base: REVIEWED_BASE,
    repository: REPOSITORY,
    ref: REF,
    run_id: safeString(process.env.GITHUB_RUN_ID, 32),
    run_attempt: safeString(process.env.GITHUB_RUN_ATTEMPT, 16),
    expected_app_id: EXPECTED_APP_ID,
    expected_client_id_sha256: EXPECTED_CLIENT_ID_SHA256,
    expected_owner: EXPECTED_OWNER,
    expected_owner_id: EXPECTED_OWNER_ID,
    expected_installation_id_sha256: EXPECTED_INSTALLATION_ID_SHA256,
  };
}

const report = {
  ...binding(),
  observed_at: new Date().toISOString(),
  result: 'not_started',
  incomplete_reason: null,
  app_identity_bound: false,
  installation_identity_bound: false,
  token_mint_attempts: 0,
  token_created: false,
  token_expires_at: null,
  token_mint_indeterminate: false,
  token_permissions_bound: false,
  token_permissions: {},
  token_revocation_attempted: false,
  token_revocation_attempts: [],
  token_revoked: false,
  token_unusable: false,
  token_cleanup_state: 'not_attempted',
  token_revocation: null,
  enumeration_complete: false,
  reported_total_count: null,
  pagination_count_changed: false,
  omitted_repository_count: 0,
  duplicate_repository_count: 0,
  record_bytes: 0,
  requests: [],
  repositories: [],
  source_reads: false,
  repository_writes: false,
  other_installations_contacted: false,
  corporate_host_requests: false,
};
try { await collect(report); }
catch { report.result = 'collection_failed'; }
try { emitEncrypted(report); }
catch { process.stderr.write('ASSESSMENT_ERROR\n'); process.exitCode = 1; }
