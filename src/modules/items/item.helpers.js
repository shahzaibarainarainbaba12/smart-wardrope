export const normalizeTags=(tags=[])=>[...new Set(tags.map(v=>String(v).trim().toLowerCase()).filter(Boolean))];
