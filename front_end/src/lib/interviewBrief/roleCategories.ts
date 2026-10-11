/**
 * Holistic role-category catalog for interview compose (stable value ids + display labels).
 * Used by [VurifySelect](../../components/VurifySelect.tsx) on the Interview manager compose form.
 */
export type InterviewRoleCategoryOption = {
  value: string
  label: string
}

export const INTERVIEW_ROLE_CATEGORY_OPTIONS: readonly InterviewRoleCategoryOption[] = [
  { value: 'accounting', label: 'Accounting' },
  { value: 'administration', label: 'Administration' },
  { value: 'aerospace-defense', label: 'Aerospace & Defense' },
  { value: 'agriculture', label: 'Agriculture & Food' },
  { value: 'ai-machine-learning', label: 'AI & Machine Learning' },
  { value: 'analytics-bi', label: 'Analytics & Business Intelligence' },
  { value: 'architecture-built', label: 'Architecture (Built Environment)' },
  { value: 'architecture-software', label: 'Architecture (Software)' },
  { value: 'arts-culture', label: 'Arts & Culture' },
  { value: 'brand-creative', label: 'Brand & Creative' },
  { value: 'business-development', label: 'Business Development' },
  { value: 'business-operations', label: 'Business Operations' },
  { value: 'community-social', label: 'Community & Social Impact' },
  { value: 'construction', label: 'Construction & Trades' },
  { value: 'consulting-strategy', label: 'Consulting & Strategy' },
  { value: 'content-editorial', label: 'Content & Editorial' },
  { value: 'customer-success', label: 'Customer Success' },
  { value: 'customer-support', label: 'Customer Support' },
  { value: 'cybersecurity', label: 'Cybersecurity' },
  { value: 'data-engineering', label: 'Data Engineering' },
  { value: 'data-science', label: 'Data Science' },
  { value: 'design-brand', label: 'Design, Brand / Visual' },
  { value: 'design-product', label: 'Design, Product / UX / UI' },
  { value: 'design-research', label: 'Design Research' },
  { value: 'devops-sre', label: 'DevOps / SRE / Platform' },
  { value: 'education-learning', label: 'Education & Learning' },
  { value: 'energy-utilities', label: 'Energy & Utilities' },
  { value: 'engineering-backend', label: 'Engineering, Backend' },
  { value: 'engineering-embedded', label: 'Engineering, Embedded / Hardware' },
  { value: 'engineering-frontend', label: 'Engineering, Frontend' },
  { value: 'engineering-fullstack', label: 'Engineering, Full Stack' },
  { value: 'engineering-mobile', label: 'Engineering, Mobile' },
  { value: 'engineering-software', label: 'Engineering, Software' },
  { value: 'executive-leadership', label: 'Executive & Leadership' },
  { value: 'facilities', label: 'Facilities & Workplace' },
  { value: 'finance', label: 'Finance' },
  { value: 'government-public', label: 'Government & Public Sector' },
  { value: 'growth-marketing', label: 'Growth Marketing' },
  { value: 'healthcare-clinical', label: 'Healthcare & Clinical' },
  { value: 'hospitality-travel', label: 'Hospitality & Travel' },
  { value: 'hr-people', label: 'People & HR' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'it-infrastructure', label: 'IT & Infrastructure' },
  { value: 'legal-compliance', label: 'Legal & Compliance' },
  { value: 'manufacturing', label: 'Manufacturing & Industrial' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'media-communications', label: 'Media & Communications' },
  { value: 'nonprofit', label: 'Nonprofit' },
  { value: 'office-management', label: 'Office Management' },
  { value: 'partnerships', label: 'Partnerships' },
  { value: 'product-management', label: 'Product Management' },
  { value: 'project-program', label: 'Project / Program Management' },
  { value: 'qa-quality', label: 'QA & Quality Engineering' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'research-science', label: 'Research & Science' },
  { value: 'retail-ecommerce', label: 'Retail & E-commerce' },
  { value: 'revenue-operations', label: 'Revenue Operations' },
  { value: 'sales', label: 'Sales' },
  { value: 'security-engineering', label: 'Security Engineering' },
  { value: 'supply-chain', label: 'Supply Chain & Logistics' },
  { value: 'talent-acquisition', label: 'Talent Acquisition' },
  { value: 'technical-writing', label: 'Technical Writing' },
  { value: 'telecommunications', label: 'Telecommunications' },
  { value: 'other', label: 'Other' },
] as const

/** Legacy fixture keys → catalog values. */
const LEGACY_CATEGORY_VALUE: Record<string, string> = {
  engineering: 'engineering-software',
  design: 'design-product',
  product: 'product-management',
  ops: 'business-operations',
}

function foldCategoryText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u2014\u2013]/g, ',')
    .replace(/\s*,\s*/g, ', ')
    .trim()
}

export function normalizeInterviewRoleCategoryValue(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const legacy = LEGACY_CATEGORY_VALUE[trimmed.toLowerCase()]
  if (legacy) return legacy
  const byValue = INTERVIEW_ROLE_CATEGORY_OPTIONS.find((o) => o.value === trimmed)
  if (byValue) return byValue.value
  const folded = foldCategoryText(trimmed)
  const byLabel = INTERVIEW_ROLE_CATEGORY_OPTIONS.find(
    (o) => foldCategoryText(o.label) === folded,
  )
  if (byLabel) return byLabel.value
  return trimmed
}

export function interviewRoleCategoryLabel(value: string): string {
  const normalized = normalizeInterviewRoleCategoryValue(value)
  const opt = INTERVIEW_ROLE_CATEGORY_OPTIONS.find((o) => o.value === normalized)
  if (opt) return opt.label
  const trimmed = value.trim()
  return trimmed || 'Uncategorized'
}
