/** Live 3D pose for a baked scene object — copy like the reference pointer. */

export const SCENE_OBJECT_POSE_KIND = 'webgl-scene-object'

export type SceneObjectPose = {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
}

export type SceneObjectPosePayload = {
  kind: typeof SCENE_OBJECT_POSE_KIND
  sceneId: string
  objectId: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
}

export function serializeSceneObjectPose(
  sceneId: string,
  objectId: string,
  pose: SceneObjectPose,
): string {
  const payload: SceneObjectPosePayload = {
    kind: SCENE_OBJECT_POSE_KIND,
    sceneId,
    objectId,
    position: [pose.position[0], pose.position[1], pose.position[2]],
    rotation: [pose.rotation[0], pose.rotation[1], pose.rotation[2]],
    scale: [pose.scale[0], pose.scale[1], pose.scale[2]],
  }
  return `${JSON.stringify(payload, null, 2)}\n`
}
