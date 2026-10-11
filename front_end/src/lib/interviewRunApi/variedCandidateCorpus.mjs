/**
 * Shared varied candidate lines for decide gauge + turn-loop stress.
 * Keep expect situations aligned with discussionDecide priority.
 */
export const VARIED_CANDIDATE_SAMPLES = [
  // Identity / purpose meta → clarify
  { text: 'Who are you?', expect: 'clarify' },
  { text: 'who are you anyway', expect: 'clarify' },
  { text: 'Are you a bot?', expect: 'clarify' },
  { text: 'Are you human or AI?', expect: 'clarify' },
  { text: "Who's interviewing me?", expect: 'clarify' },
  { text: 'What am I here for?', expect: 'clarify' },
  { text: 'what am I doing for?', expect: 'clarify' },
  { text: 'why are we doing this', expect: 'clarify' },
  { text: 'why am I here', expect: 'clarify' },
  { text: 'what is this for', expect: 'clarify' },
  { text: 'what is this about', expect: 'clarify' },
  { text: "what's the point", expect: 'clarify' },
  { text: "what's the point of this interview", expect: 'clarify' },
  { text: 'what are we doing here', expect: 'clarify' },
  { text: 'is this recorded', expect: 'clarify' },
  { text: 'how long is this', expect: 'clarify' },
  { text: 'do I have to answer', expect: 'clarify' },

  // Ask / confusion meta → clarify
  { text: 'can you repeat the question', expect: 'clarify' },
  { text: 'can you rephrase that', expect: 'clarify' },
  { text: 'what are you saying?', expect: 'clarify' },
  { text: 'what are you asking?', expect: 'clarify' },
  { text: 'what do you mean?', expect: 'clarify' },
  { text: 'I do not follow', expect: 'clarify' },
  { text: "I don't understand", expect: 'clarify' },
  { text: 'huh?', expect: 'clarify' },
  { text: 'which project', expect: 'clarify' },
  { text: 'which one', expect: 'clarify' },
  { text: 'which team', expect: 'clarify' },
  { text: 'can you clarify', expect: 'clarify' },

  // Ask for example → clarify
  { text: 'can you give an example?', expect: 'clarify' },
  { text: 'give me an example', expect: 'clarify' },
  { text: 'for example?', expect: 'clarify' },
  { text: 'like what?', expect: 'clarify' },
  { text: 'show me what you mean', expect: 'clarify' },

  // Gibberish / non-answer → clarify
  { text: 'asdf', expect: 'clarify' },
  { text: 'sdfsd', expect: 'clarify' },
  { text: 'qwer', expect: 'clarify' },
  { text: 'xxx', expect: 'clarify' },
  { text: 'idk', expect: 'clarify' },
  { text: "I don't know", expect: 'clarify' },
  { text: 'not sure', expect: 'clarify' },
  { text: 'no idea', expect: 'clarify' },
  { text: 'nothing', expect: 'clarify' },
  { text: 'pass', expect: 'clarify' },
  { text: 'skip', expect: 'clarify' },
  { text: 'whatever', expect: 'clarify' },
  { text: 'hmm', expect: 'clarify' },
  { text: 'yeah', expect: 'clarify' },
  { text: 'the outage', expect: 'clarify' },
  { text: 'we did', expect: 'clarify' },
  { text: 'I worked on it.', expect: 'clarify' },
  { text: 'stuff happened', expect: 'clarify' },
  { text: 'hmm not sure which conflict you mean', expect: 'clarify|probe_gap' },

  // Logistics / recruiting off-topic
  { text: 'Tell me about the company culture', expect: 'off_topic' },
  { text: 'tell me about the company', expect: 'off_topic' },
  { text: 'tell me about the role', expect: 'off_topic' },
  { text: 'tell me about the team', expect: 'off_topic' },
  { text: 'tell me about the benefits', expect: 'off_topic' },
  { text: 'what is the salary', expect: 'off_topic' },
  { text: 'what is the compensation', expect: 'off_topic' },
  { text: 'when do I hear back', expect: 'off_topic' },
  { text: 'how many vacation days', expect: 'off_topic' },
  { text: 'remote work policy', expect: 'off_topic' },
  { text: 'work from home', expect: 'off_topic' },
  { text: 'signing bonus', expect: 'off_topic' },
  { text: 'stock options', expect: 'off_topic' },
  { text: 'office location', expect: 'off_topic' },

  // Ownership deepen
  { text: 'We kind of handled stuff somehow.', expect: 'clarify' },
  { text: 'We handled a priority fight as a team last quarter.', expect: 'deepen' },
  { text: 'Our team shipped it together last sprint.', expect: 'deepen' },
  { text: 'We decided as a group to freeze the API.', expect: 'deepen' },

  // Substantive personal answers → advance (budget dependent)
  {
    text: 'I led the checkout rewrite and cut p99 by 40ms after a fight with PM.',
    expect: 'move_probe|probe_gap|follow_up|close|deepen',
  },
  {
    text: 'I decided the API freeze myself and tracked error rate down 12%.',
    expect: 'move_probe|probe_gap|follow_up|close|deepen',
  },
  {
    text: 'I owned the escalation path and reduced Sev-1 pages by half.',
    expect: 'move_probe|probe_gap|follow_up|close|deepen',
  },
  {
    text: 'I chose latency over features under a hard deadline and told the stakeholder no.',
    expect: 'move_probe|probe_gap|follow_up|close|deepen',
  },
]
