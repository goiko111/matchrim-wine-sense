export class CatalogSearchInputError extends Error {}

export const parseCatalogSearchInput = (body: unknown) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new CatalogSearchInputError('Cuerpo de busqueda invalido');
  const { query, limit = 20, catalogOnly = false } = body as Record<string, unknown>;
  if (typeof query !== 'string' || query.length > 240 || Array.from(query).some((character) => character.charCodeAt(0) < 32)) throw new CatalogSearchInputError('Consulta de busqueda invalida');
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > 50) throw new CatalogSearchInputError('Limite de busqueda invalido');
  if (typeof catalogOnly !== 'boolean') throw new CatalogSearchInputError('Modo de catalogo invalido');
  return { query: query.trim(), limit, catalogOnly };
};

// PostgREST .or() consumes raw grammar. Quote each complete LIKE pattern so
// punctuation in wine names cannot become additional filters or break parsing.
export const catalogSearchFilter = (variants: string[]) => variants.flatMap((variant) => {
  const literal = variant.replace(/\\/g, '\\\\').replace(/[%_]/g, '\\$&').replace(/\*/g, ' ');
  const value = `"%${literal.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}%"`;
  return ['name', 'producer', 'region'].map((column) => `${column}.ilike.${value}`);
}).join(',');
