export const supabase = { from(table) {
  const state = globalThis.__consumer95, query = { table };
  state.queries.push(query);
  const result = () => ({ data: query.owner === state.owner
    ? table === 'quiz_results' ? state.base : state.rows
    : table === 'quiz_results' ? null : [], error: null });
  const chain = { select: () => chain, order: () => chain, limit: () => chain, not: () => chain,
    eq: (key, value) => { if (key === 'user_id') query.owner = value; return chain; },
    abortSignal: () => chain, maybeSingle: async () => result(),
    then: (yes, no) => Promise.resolve(result()).then(yes, no) };
  return chain;
} };
