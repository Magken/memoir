/**
 * Assessor Aid HTTP failures must name the status, not "unknown".
 * Run: npx tsx front_end/src/lib/interviewRunApi/assessorAidEdgeClient.unit.mjs
 */
import assert from 'node:assert/strict'
import { classifyAssessorAidHttpError } from './assessorAidEdgeClient.ts'

{
  const gateway = classifyAssessorAidHttpError({ status: 503 })
  assert.equal(gateway.code, 'unknown')
  assert.equal(
    gateway.message,
    'http_503',
    'Kong HTML 503 has no JSON envelope — DIAG must still name the status',
  )
}

{
  const restart = classifyAssessorAidHttpError({ status: 502 })
  assert.equal(restart.message, 'http_502')
}

{
  const limit = classifyAssessorAidHttpError({ status: 546 })
  assert.equal(limit.message, 'http_546')
  const namedLimit = classifyAssessorAidHttpError({
    status: 546,
    error: { code: 'WORKER_RESOURCE_LIMIT' },
  })
  assert.equal(namedLimit.message, 'http_546')
  assert.equal(
    namedLimit.message === 'http_503',
    false,
    'negative: a 546 worker kill is not a Kong restart 503',
  )
}

{
  const auth = classifyAssessorAidHttpError({ status: 401 })
  assert.equal(auth.code, 'not_authenticated')
  assert.equal(auth.message, 'not_authenticated')
}

{
  const key = classifyAssessorAidHttpError({
    status: 502,
    error: { code: 'missing_openai_key' },
  })
  assert.equal(key.code, 'missing_openai_key')
  assert.equal(key.message, 'missing_openai_key')
}

{
  const mixed = classifyAssessorAidHttpError({
    status: 546,
    error: { code: 'missing_openai_key' },
  })
  assert.equal(
    mixed.message,
    'missing_openai_key',
    'negative: a known Edge code still wins when the status is 546',
  )
}

{
  const empty = classifyAssessorAidHttpError({
    status: 502,
    error: { code: 'compose_empty' },
  })
  assert.equal(empty.code, 'compose_empty')
}

{
  const named = classifyAssessorAidHttpError({
    status: 502,
    error: { code: 'assessor_aid_failed' },
  })
  assert.equal(
    named.message,
    'assessor_aid_failed',
    'an Edge envelope code is preferred over http_502',
  )
}

{
  const silence = classifyAssessorAidHttpError({
    status: 503,
    error: { code: 'unknown' },
  })
  assert.equal(
    silence.message,
    'http_503',
    'negative: an envelope that only says unknown is not more informative than the status',
  )
}

console.log('assessorAidEdgeClient.unit.mjs: ok')
