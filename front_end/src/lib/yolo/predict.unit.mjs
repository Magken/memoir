/**
 * The predict body is one camera image. The parser keeps 2D boxes only.
 * Run: node --experimental-strip-types front_end/src/lib/yolo/predict.unit.mjs
 */
import assert from 'node:assert/strict'
import { buildYoloPredictRequest, bytesToBase64, parseYoloPredict, YoloRequestError } from './predict.ts'

const body = buildYoloPredictRequest('data:image/jpeg;base64,QUJD')
assert.deepEqual(body, { images: [{ camera: 'CAM_FRONT', data: 'QUJD' }] })

assert.throws(
  () => buildYoloPredictRequest('   '),
  (error) => error instanceof YoloRequestError && error.field === 'image',
  'negative: an empty image is not a predict body',
)

const parsed = parseYoloPredict({
  model: 'yolox-p150',
  num_detections: 1,
  detections: [
    { label: 'CAR', label_id: 1, score: 0.93, box_xyxy: [10, 20, 40, 80] },
    { label: 'CUBOID', label_id: 9, score: 0.99, box_xyz: [1, 2, 3], size: [4, 5, 6] },
  ],
  meta: { image_hw: [827, 1280] },
  timing_ms: { total: 172.6 },
})

assert.equal(parsed.detections.length, 1)
assert.equal(parsed.detections[0].label, 'CAR')
assert.deepEqual(parsed.detections[0].box, [10, 20, 40, 80])
assert.deepEqual(parsed.imageHw, [827, 1280])
assert.equal(parsed.totalMs, 172.6)
assert.equal(parsed.numDetections, 1)

const dropped = parseYoloPredict({
  detections: [{ label: 'CAR', box_xyz: [0, 0, 0], box_lwh: [1, 1, 1] }],
})
assert.deepEqual(dropped.detections, [], 'negative: a 3D-only row is not a detection')

assert.equal(bytesToBase64(new Uint8Array([65, 66, 67])), 'QUJD')

console.log('yolo predict: ok')
