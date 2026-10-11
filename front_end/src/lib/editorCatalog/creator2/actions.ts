import type { EditorAction } from '../types'

export type Creator2EditorAction = EditorAction

/** Creator-2 board action spine — invoked from recommendation clicks (not bot propose). */
export const CREATOR2_EDITOR_ACTIONS: Creator2EditorAction[] = [
  {
    id: 'creator2.action.scroll-to-section',
    label: 'Scroll to section',
    kind: 'ui',
    target: 'InterviewFlowTimeline.scrollToSection',
    notation: 'section.scroll',
    implemented: true,
    relatedFeatures: ['creator2.navigation.sections'],
  },
  {
    id: 'creator2.action.open-section',
    label: 'Open section edit',
    kind: 'ui',
    target: 'InterviewFlowTimeline.openSection',
    notation: 'section.open',
    implemented: true,
    relatedFeatures: ['creator2.navigation.sections', 'creator2.chrome.edit-stage'],
  },
  {
    id: 'creator2.action.focus-section',
    label: 'Focus section (scroll + open)',
    kind: 'ui',
    target: 'InterviewFlowTimeline.focusSection',
    notation: 'section.focus',
    implemented: true,
    relatedFeatures: ['creator2.navigation.sections', 'creator2.chrome.edit-stage'],
  },
  {
    id: 'creator2.action.exit-edit',
    label: 'Exit edit stage',
    kind: 'ui',
    target: 'InterviewFlowTimeline.exitEditStage',
    notation: 'edit.exit',
    implemented: true,
    relatedFeatures: ['creator2.chrome.edit-stage'],
  },
  {
    id: 'creator2.action.save',
    label: 'Save interview brief',
    kind: 'command',
    target: 'InterviewCreator.handleSaveInterview',
    notation: 'brief.save',
    implemented: true,
    relatedFeatures: ['creator2.io.save'],
  },
  {
    id: 'creator2.action.flush-before-bot-turn',
    label: 'Flush unsaved board before bot turn',
    kind: 'command',
    target: 'InterviewCreator.flushCreator2ForBotTurn',
    notation: 'brief.flushBeforeBot',
    implemented: true,
    relatedFeatures: ['creator2.io.save', 'creator2.chat.board-edit'],
  },
  {
    id: 'creator2.action.submit-clarifications',
    label: 'Submit clarification answers',
    kind: 'command',
    target: 'InterviewCreatorChat.submitClarifications',
    notation: 'chat.clarifications',
    implemented: true,
    relatedFeatures: ['creator2.chat.clarifications'],
  },
  {
    id: 'creator2.action.apply-edited-body',
    label: 'Apply board-edited brief body',
    kind: 'command',
    target: 'InterviewCreator.applyBoardEditedBody',
    notation: 'chat.applyEditedBody',
    implemented: true,
    relatedFeatures: ['creator2.chat.board-edit'],
  },
]

export function creator2ActionById(id: string): Creator2EditorAction | undefined {
  return CREATOR2_EDITOR_ACTIONS.find((action) => action.id === id)
}
