import { assertSupabaseClient } from '@/lib/supabaseClient';

export async function saveThoughtWithOutputs({ userId, thought, tone, format, generation }) {
  const supabase = assertSupabaseClient();

  const { data: thoughtRow, error: thoughtError } = await supabase
    .from('thoughts')
    .insert({
      user_id: userId,
      content: thought,
      tone,
      format
    })
    .select('id')
    .single();

  if (thoughtError) {
    throw thoughtError;
  }

  const rows = [];

  (generation.tweets || []).forEach((content, index) => {
    rows.push({
      thought_id: thoughtRow.id,
      content,
      type: 'tweet',
      position: index + 1
    });
  });

  (generation.thread || []).forEach((content, index) => {
    rows.push({
      thought_id: thoughtRow.id,
      content,
      type: 'thread',
      position: index + 1
    });
  });

  if (rows.length > 0) {
    const { error: outputError } = await supabase.from('generated_content').insert(rows);

    if (outputError) {
      throw outputError;
    }
  }

  return thoughtRow.id;
}

export async function fetchThoughtsWithOutputs(userId) {
  const supabase = assertSupabaseClient();

  const { data, error } = await supabase
    .from('thoughts')
    .select('id, content, tone, format, created_at, generated_content(id, content, type, position, created_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map((item) => ({
    ...item,
    generated_content: (item.generated_content || []).sort((a, b) => a.position - b.position)
  }));
}

export async function fetchGeneratedContent(userId) {
  const thoughts = await fetchThoughtsWithOutputs(userId);

  return thoughts
    .flatMap((thought) =>
      (thought.generated_content || []).map((output) => ({
        id: output.id,
        type: output.type,
        content: output.content,
        position: output.position,
        created_at: output.created_at,
        thought_id: thought.id,
        thought_content: thought.content,
        thought_created_at: thought.created_at
      }))
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
