import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { redirect } from 'next/navigation'
import TemplateEditor from './TemplateEditor'

export interface QuestionRow {
  id: string
  question_text: string
  field_key: string
  input_type: string
  options: string[] | null
  textarea_rows: number
  is_profile_linked: boolean
  display_order: number
  is_active: boolean
}

export interface SectionRow {
  id: number
  title: string
  display_order: number
  questions: QuestionRow[]
}

export default async function QuestionnaireTemplatePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: sections } = await admin
    .from('questionnaire_sections')
    .select(`
      id, title, display_order,
      questionnaire_questions (
        id, question_text, field_key, input_type, options,
        textarea_rows, is_profile_linked, display_order, is_active
      )
    `)
    .order('display_order')

  const shaped: SectionRow[] = (sections ?? []).map(s => ({
    id: s.id,
    title: s.title,
    display_order: s.display_order,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    questions: ((s.questionnaire_questions as any[]) ?? [])
      .filter((q: QuestionRow) => q.is_active)
      .sort((a: QuestionRow, b: QuestionRow) => a.display_order - b.display_order),
  }))

  return (
    <div>
      <PageHeader
        title="Questionnaire template"
        description="Manage the questions franchisors answer. Profile-linked questions (🔒) cannot be edited."
      />
      <TemplateEditor sections={shaped} />
    </div>
  )
}
