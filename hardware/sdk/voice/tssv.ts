/**
 * Sensory TrulySecure Sound & Voice (TSSV) 3.15.11 — the `voice` slot.
 * On-device wake words, speech-to-text, speaker enrollment/authentication and sound ID,
 * driven through the SDK's command-line tools. TSSV does not synthesize speech; spoken
 * output uses `front_end/src/lib/voice/speak.ts`.
 *
 * Audio in: 16 kHz, 16-bit signed, mono WAV. The hackathon license stops every tool at
 * TSSV_LICENSE_EXPIRES. The vendor tree (gitignored) sits beside this file.
 */
import { execFile } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const TSSV_VERSION = '3.15.11'
export const TSSV_LICENSE_EXPIRES = '2026-11-01T12:00:00Z'
export const TSSV_SAMPLE_RATE = 16000
export const TSSV_ROOT = join(dirname(fileURLToPath(import.meta.url)), `sensory-tssv-${TSSV_VERSION}`)

export type TssvTool = 'tssvSpeechRecognizer' | 'tssvTriggerRecognizer' | 'tssvEnroller' | 'tssvAuthenticator'
export type TssvThreshold = 'LOWEST' | 'LOW' | 'MEDIUM' | 'HIGH' | 'HIGHEST'
export type TssvSecurityMode = 'LOW_SECURITY' | 'MEDIUM_SECURITY' | 'HIGH_SECURITY'

/** Named models shipped in `models/`. */
export const TSSV_MODELS = {
  stt: 'stt-16kHz-en-general-medium-int8.mod',
  sttFull: 'stt-16kHz-en-general-medium-f16.mod',
  speakerBackground: 'text-independent-16kHz-iot.ubm',
  speakerRevalidation: 'text-independent-16kHz-iot-revalidation.ubm',
  soundRevalidation: 'sound-16kHz-iot-revalidation.trg',
  soundAll: 'sound-16kHz-iot-combined-all.trg',
  wakeHelloBlueGenie: 'wakeword-16kHz-iot-hello_blue_genie.trg',
  wakeVoiceGenie: 'wakeword-16kHz-iot-voice_genie.trg',
} as const

export function tssvLicenseActive(now = new Date()): boolean {
  return now.getTime() < Date.parse(TSSV_LICENSE_EXPIRES)
}

export function tssvModel(file: string, root = TSSV_ROOT): string {
  return join(root, 'models', file)
}

/** Same pick as `sdk/sdk-env.bat`: first compiler, dcrt before scrt, x86_64. */
export function tssvBinDir(root = TSSV_ROOT): string {
  const win = join(root, 'sdk', 'win')
  if (!existsSync(win)) throw new Error(`TSSV SDK not found at ${win}`)
  const compiler = readdirSync(win, { withFileTypes: true }).find((entry) => entry.isDirectory())
  if (!compiler) throw new Error('TSSV SDK has no Windows build')
  const variant = ['dcrt', 'scrt'].find((name) => existsSync(join(win, compiler.name, name)))
  if (!variant) throw new Error('TSSV SDK has no runtime variant')
  return join(win, compiler.name, variant, 'x86_64', 'bin')
}

export function speechArgs(wav: string, model = tssvModel(TSSV_MODELS.stt)): string[] {
  return ['--model', model, '--mode', 'stream', '--input-file', wav]
}

export function triggerArgs(
  wav: string,
  triggerModel: string,
  threshold: TssvThreshold = 'MEDIUM',
  revalidationModel?: string,
): string[] {
  return [
    '--trigger-model',
    triggerModel,
    ...(revalidationModel ? ['--revalidation-model', revalidationModel] : []),
    '--threshold',
    threshold,
    wav,
  ]
}

export function enrollArgs(user: string, wavs: readonly string[], enrollmentOut: string): string[] {
  if (!/^[\w-]+$/.test(user)) throw new Error('User id must be letters, digits, _ or -')
  if (!wavs.length) throw new Error('Enrollment needs at least one recording')
  return [
    '--min-enroll-dur',
    '12.5',
    '--background-model',
    tssvModel(TSSV_MODELS.speakerBackground),
    '--enrollment-model',
    enrollmentOut,
    '--check-quality',
    'MEDIUM',
    `+${user}`,
    ...wavs,
  ]
}

export function authenticateArgs(
  wav: string,
  enrollment: string,
  security: TssvSecurityMode = 'HIGH_SECURITY',
  threshold: TssvThreshold = 'LOWEST',
): string[] {
  return [
    '--enrollment-model',
    enrollment,
    '--background-model',
    tssvModel(TSSV_MODELS.speakerBackground),
    '--security-mode',
    security,
    '--threshold',
    threshold,
    wav,
  ]
}

/** Runs one TSSV tool and resolves its stdout. Fails fast once the license has expired. */
export function runTssv(tool: TssvTool, args: readonly string[], root = TSSV_ROOT): Promise<string> {
  if (!tssvLicenseActive()) return Promise.reject(new Error(`TSSV license expired at ${TSSV_LICENSE_EXPIRES}`))
  const bin = tssvBinDir(root)
  return new Promise((resolve, reject) => {
    execFile(join(bin, `${tool}.exe`), [...args], { cwd: bin, maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr.trim() || error.message))
      else resolve(stdout)
    })
  })
}

/** The `hypothesis :` line of a tssvSpeechRecognizer report ('' when nothing was heard). */
export function parseTranscript(stdout: string): string {
  const lines = [...stdout.matchAll(/^\s*hypothesis\s*:\s*(.*)$/gm)].map((match) => match[1].trim())
  return lines.join(' ').trim()
}

/** Speech-to-text for one recording. */
export async function transcribe(wav: string): Promise<string> {
  return parseTranscript(await runTssv('tssvSpeechRecognizer', speechArgs(wav)))
}

/** Wake word in one recording (default: "Hello Blue Genie"). */
export function detectWakeWord(wav: string, model = tssvModel(TSSV_MODELS.wakeHelloBlueGenie), threshold: TssvThreshold = 'MEDIUM') {
  return runTssv('tssvTriggerRecognizer', triggerArgs(wav, model, threshold))
}

/** Sound events (alarm, knock, dog, …) in one recording; two-stage with revalidation. */
export function identifySound(wav: string, model = tssvModel(TSSV_MODELS.soundAll), threshold: TssvThreshold = 'LOWEST') {
  return runTssv('tssvTriggerRecognizer', triggerArgs(wav, model, threshold, tssvModel(TSSV_MODELS.soundRevalidation)))
}

/** Text-independent voice enrollment → writes `enrollmentOut`. */
export function enrollSpeaker(user: string, wavs: readonly string[], enrollmentOut: string) {
  return runTssv('tssvEnroller', enrollArgs(user, wavs, enrollmentOut))
}

/** Checks one recording against an enrollment model. */
export function authenticateSpeaker(wav: string, enrollment: string) {
  return runTssv('tssvAuthenticator', authenticateArgs(wav, enrollment))
}
