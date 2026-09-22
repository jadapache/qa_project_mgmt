import type { LucideIcon } from 'lucide-react'
import { ClipboardCheck, Database, Eye, Rocket, TestTube2 } from 'lucide-react'

export type QaFeatureConfig = {
  slug: string
  feature: string
  title: string
  description: string
  uploadTags: string
  placeholder: string
  defaultQuery: string
  defaultSources: string[]
  icon: LucideIcon
}

export const QA_FEATURES: QaFeatureConfig[] = [
  {
    slug: 'regression',
    feature: 'regression',
    title: 'Regression',
    description: 'Upload test plans, release notes, or specs. Pull Jira/GitHub/GitLab context to suggest a focused regression scope.',
    uploadTags: 'qa,regression,test-plan',
    placeholder: 'What changed in v2.4? Which flows need regression?',
    defaultQuery: 'Suggest a regression test scope from uploaded files and connected sources.',
    defaultSources: ['jira', 'github', 'gitlab', 'knowledge'],
    icon: TestTube2,
  },
  {
    slug: 'api-qa',
    feature: 'api_qa',
    title: 'API QA',
    description: 'Upload OpenAPI specs, Postman collections, or API docs. Identify coverage gaps and edge cases to test.',
    uploadTags: 'qa,api,openapi',
    placeholder: 'Review the checkout API for missing negative tests.',
    defaultQuery: 'Analyze API test coverage gaps from uploaded specs.',
    defaultSources: ['knowledge', 'github', 'gitlab'],
    icon: ClipboardCheck,
  },
  {
    slug: 'visual-qa',
    feature: 'visual_qa',
    title: 'Visual QA',
    description: 'Upload UI specs, design docs, or acceptance criteria. Get a visual QA checklist grounded in your documents.',
    uploadTags: 'qa,visual,ui-spec',
    placeholder: 'Build a visual QA checklist for the new dashboard.',
    defaultQuery: 'Create a visual QA checklist from uploaded UI specs.',
    defaultSources: ['knowledge', 'jira'],
    icon: Eye,
  },
  {
    slug: 'smart-test-data',
    feature: 'smart_test_data',
    title: 'Smart Test Data',
    description: 'Upload schemas, forms specs, or data rules. Generate realistic test data scenarios with constraints.',
    uploadTags: 'qa,test-data,schema',
    placeholder: 'Generate test data for edge cases in the patient registration form.',
    defaultQuery: 'Suggest smart test data scenarios from uploaded schemas and rules.',
    defaultSources: ['knowledge'],
    icon: Database,
  },
  {
    slug: 'release-readiness',
    feature: 'release_readiness',
    title: 'Release Readiness',
    description: 'Upload release notes and checklists. Cross-reference Jira, GitHub, and GitLab for ship/no-ship signals.',
    uploadTags: 'qa,release,checklist',
    placeholder: 'Are we ready to ship v2.4? What blockers remain?',
    defaultQuery: 'Assess release readiness from uploaded docs and live sources.',
    defaultSources: ['jira', 'github', 'gitlab', 'knowledge'],
    icon: Rocket,
  },
]

export const QA_FEATURE_BY_SLUG = Object.fromEntries(QA_FEATURES.map((item) => [item.slug, item])) as Record<
  string,
  QaFeatureConfig
>

export const QA_SOURCE_OPTIONS = [
  { id: 'jira', label: 'Jira' },
  { id: 'github', label: 'GitHub' },
  { id: 'gitlab', label: 'GitLab' },
  { id: 'knowledge', label: 'Knowledge library' },
]
