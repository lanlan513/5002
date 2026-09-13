import { Router } from "express";
import db from "./db.js";

/**
 * 生态系统探索模块 API
 * 物种、环境因素、关系均为全局统一数据，通过成员表挂接到各个生态系统，
 * 因此新增生态系统时可以直接复用已有物种与组件。
 */

const router = Router();

const ecosystemRow = `
  SELECT ecosystems.*,
    (SELECT COUNT(*) FROM ecosystem_species WHERE ecosystem_slug = ecosystems.slug) AS species_count,
    (SELECT COUNT(*) FROM relationships WHERE relationships.ecosystem_slug = ecosystems.slug) AS link_count,
    (SELECT COUNT(*) FROM ecosystem_factors WHERE ecosystem_slug = ecosystems.slug) AS factor_count
  FROM ecosystems
`;

// ---------- 生态系统 ----------

router.get("/ecosystems", (_request, response) => {
  response.json(db.prepare(`${ecosystemRow} ORDER BY position`).all());
});

router.get("/ecosystems/:slug", (request, response) => {
  const ecosystem = db.prepare(`${ecosystemRow} WHERE slug = ?`).get(request.params.slug);
  if (!ecosystem) return response.status(404).json({ message: "Ecosystem not found" });

  const speciesNodes = (db
    .prepare(`
      SELECT species.slug AS id, species.name, species.latin_name, species.role,
             species.description, ecosystem_species.trophic_level
      FROM ecosystem_species
      JOIN species ON species.slug = ecosystem_species.species_slug
      WHERE ecosystem_species.ecosystem_slug = ?
      ORDER BY ecosystem_species.trophic_level, species.name
    `)
    .all(request.params.slug) as Array<Record<string, unknown>>)
    .map((node) => ({ ...node, kind: "species" as const }));

  const factorNodes = (db
    .prepare(`
      SELECT environmental_factors.slug AS id, environmental_factors.name,
             environmental_factors.category, environmental_factors.description,
             ecosystem_factors.note
      FROM ecosystem_factors
      JOIN environmental_factors ON environmental_factors.slug = ecosystem_factors.factor_slug
      WHERE ecosystem_factors.ecosystem_slug = ?
    `)
    .all(request.params.slug) as Array<Record<string, unknown>>)
    .map((node) => ({ ...node, kind: "factor" as const, role: "environment" as const }));

  const links = db
    .prepare(`
      SELECT id, from_slug AS "from", to_slug AS "to", type, note
      FROM relationships WHERE ecosystem_slug = ?
    `)
    .all(request.params.slug);

  return response.json({ ...ecosystem, nodes: [...factorNodes, ...speciesNodes], links });
});

router.post("/ecosystems", (request, response) => {
  const { slug, name, englishName, description, climate, color, icon, position } = request.body ?? {};
  if (![slug, name, description].every((value) => typeof value === "string" && value.trim())) {
    return response.status(400).json({ message: "slug、name、description 为必填项" });
  }
  try {
    db.prepare(`
      INSERT INTO ecosystems (slug, name, english_name, description, climate, color, icon, position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      slug.trim(),
      name.trim(),
      englishName ?? "",
      description.trim(),
      climate ?? "",
      color ?? "#8fd8a8",
      icon ?? "trees",
      Number.isFinite(position) ? position : 99
    );
  } catch {
    return response.status(409).json({ message: `生态系统标识「${slug}」已存在` });
  }
  return response.status(201).json(db.prepare(`${ecosystemRow} WHERE slug = ?`).get(slug.trim()));
});

router.put("/ecosystems/:slug", (request, response) => {
  const existing = db.prepare("SELECT * FROM ecosystems WHERE slug = ?").get(request.params.slug) as
    | Record<string, unknown>
    | undefined;
  if (!existing) return response.status(404).json({ message: "Ecosystem not found" });

  const body = request.body ?? {};
  const next = {
    name: body.name ?? existing.name,
    english_name: body.englishName ?? existing.english_name,
    description: body.description ?? existing.description,
    climate: body.climate ?? existing.climate,
    color: body.color ?? existing.color,
    icon: body.icon ?? existing.icon,
    position: Number.isFinite(body.position) ? body.position : existing.position
  };
  db.prepare(`
    UPDATE ecosystems SET name = ?, english_name = ?, description = ?, climate = ?, color = ?, icon = ?, position = ?
    WHERE slug = ?
  `).run(next.name, next.english_name, next.description, next.climate, next.color, next.icon, next.position, request.params.slug);
  return response.json(db.prepare(`${ecosystemRow} WHERE slug = ?`).get(request.params.slug));
});

router.delete("/ecosystems/:slug", (request, response) => {
  // 成员关系与关系数据通过外键 ON DELETE CASCADE 一并清理
  const result = db.prepare("DELETE FROM ecosystems WHERE slug = ?").run(request.params.slug);
  if (result.changes === 0) return response.status(404).json({ message: "Ecosystem not found" });
  return response.json({ deleted: request.params.slug });
});

// ---------- 物种 ----------

router.get("/species", (_request, response) => {
  const rows = db
    .prepare(`
      SELECT species.*, GROUP_CONCAT(ecosystem_species.ecosystem_slug) AS ecosystems
      FROM species
      LEFT JOIN ecosystem_species ON ecosystem_species.species_slug = species.slug
      GROUP BY species.slug
      ORDER BY species.role, species.trophic_level, species.name
    `)
    .all() as Array<Record<string, unknown>>;
  response.json(
    rows.map((row) => ({
      ...row,
      ecosystems: typeof row.ecosystems === "string" ? (row.ecosystems as string).split(",") : []
    }))
  );
});

router.get("/species/:slug", (request, response) => {
  const item = db.prepare("SELECT * FROM species WHERE slug = ?").get(request.params.slug);
  if (!item) return response.status(404).json({ message: "Species not found" });

  const ecosystemsOfSpecies = db
    .prepare(`
      SELECT ecosystems.slug, ecosystems.name, ecosystem_species.trophic_level
      FROM ecosystem_species JOIN ecosystems ON ecosystems.slug = ecosystem_species.ecosystem_slug
      WHERE ecosystem_species.species_slug = ? ORDER BY ecosystems.position
    `)
    .all(request.params.slug);

  const relations = db
    .prepare(`
      SELECT id, ecosystem_slug, from_slug AS "from", to_slug AS "to", type, note
      FROM relationships WHERE from_slug = ? OR to_slug = ?
    `)
    .all(request.params.slug, request.params.slug);

  return response.json({ ...item, ecosystems: ecosystemsOfSpecies, relations });
});

const upsertMemberships = (slug: string, ecosystemSlugs: unknown, trophicLevel: number) => {
  if (!Array.isArray(ecosystemSlugs)) return;
  const insert = db.prepare(`
    INSERT OR IGNORE INTO ecosystem_species (ecosystem_slug, species_slug, trophic_level)
    VALUES (?, ?, ?)
  `);
  const known = new Set(
    (db.prepare("SELECT slug FROM ecosystems").all() as Array<{ slug: string }>).map((row) => row.slug)
  );
  ecosystemSlugs
    .filter((ecosystem): ecosystem is string => typeof ecosystem === "string" && known.has(ecosystem))
    .forEach((ecosystem) => insert.run(ecosystem, slug, trophicLevel));
};

router.post("/species", (request, response) => {
  const { slug, name, latinName, role, trophicLevel, description, ecosystems: homes } = request.body ?? {};
  if (![slug, name, description].every((value) => typeof value === "string" && value.trim())) {
    return response.status(400).json({ message: "slug、name、description 为必填项" });
  }
  if (!["producer", "consumer", "decomposer"].includes(role)) {
    return response.status(400).json({ message: "role 必须是 producer / consumer / decomposer" });
  }
  const level = Number.isFinite(trophicLevel) ? Math.max(0, Math.min(6, Math.round(trophicLevel))) : 1;
  try {
    db.transaction(() => {
      db.prepare(`
        INSERT INTO species (slug, name, latin_name, role, trophic_level, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(slug.trim(), name.trim(), latinName ?? "", role, level, description.trim());
      upsertMemberships(slug.trim(), homes, level);
    })();
  } catch {
    return response.status(409).json({ message: `物种标识「${slug}」已存在` });
  }
  return response.status(201).json(db.prepare("SELECT * FROM species WHERE slug = ?").get(slug.trim()));
});

router.put("/species/:slug", (request, response) => {
  const existing = db.prepare("SELECT * FROM species WHERE slug = ?").get(request.params.slug) as
    | Record<string, unknown>
    | undefined;
  if (!existing) return response.status(404).json({ message: "Species not found" });

  const body = request.body ?? {};
  const role = body.role ?? existing.role;
  if (!["producer", "consumer", "decomposer"].includes(role)) {
    return response.status(400).json({ message: "role 必须是 producer / consumer / decomposer" });
  }
  const level = Number.isFinite(body.trophicLevel)
    ? Math.max(0, Math.min(6, Math.round(body.trophicLevel)))
    : (existing.trophic_level as number);

  db.transaction(() => {
    db.prepare(`
      UPDATE species SET name = ?, latin_name = ?, role = ?, trophic_level = ?, description = ?
      WHERE slug = ?
    `).run(
      body.name ?? existing.name,
      body.latinName ?? existing.latin_name,
      role,
      level,
      body.description ?? existing.description,
      request.params.slug
    );
    if (Array.isArray(body.ecosystems)) {
      db.prepare("DELETE FROM ecosystem_species WHERE species_slug = ?").run(request.params.slug);
      upsertMemberships(request.params.slug, body.ecosystems, level);
    }
  })();
  return response.json(db.prepare("SELECT * FROM species WHERE slug = ?").get(request.params.slug));
});

router.delete("/species/:slug", (request, response) => {
  const result = db.transaction(() => {
    db.prepare("DELETE FROM relationships WHERE from_slug = ? OR to_slug = ?").run(
      request.params.slug,
      request.params.slug
    );
    return db.prepare("DELETE FROM species WHERE slug = ?").run(request.params.slug);
  })();
  if (result.changes === 0) return response.status(404).json({ message: "Species not found" });
  return response.json({ deleted: request.params.slug });
});

// ---------- 关系 ----------

router.get("/relationships", (request, response) => {
  const { ecosystem } = request.query;
  const sql = `
    SELECT relationships.id, relationships.ecosystem_slug, relationships.from_slug AS "from",
           relationships.to_slug AS "to", relationships.type, relationships.note
    FROM relationships
    ${typeof ecosystem === "string" ? "WHERE ecosystem_slug = ?" : ""}
    ORDER BY relationships.id
  `;
  const rows = typeof ecosystem === "string" ? db.prepare(sql).all(ecosystem) : db.prepare(sql).all();
  response.json(rows);
});

router.post("/relationships", (request, response) => {
  const { ecosystem, from, to, type, note } = request.body ?? {};
  if (![ecosystem, from, to].every((value) => typeof value === "string" && value.trim())) {
    return response.status(400).json({ message: "ecosystem、from、to 为必填项" });
  }
  if (!["energy", "decomposition", "support"].includes(type)) {
    return response.status(400).json({ message: "type 必须是 energy / decomposition / support" });
  }
  if (from === to) return response.status(400).json({ message: "关系两端不能是同一节点" });

  const ecosystemExists = db.prepare("SELECT 1 FROM ecosystems WHERE slug = ?").get(ecosystem);
  if (!ecosystemExists) return response.status(404).json({ message: `生态系统「${ecosystem}」不存在` });

  // 关系两端必须已经属于该生态系统（物种经成员表，环境因素经因素表）
  const nodeExists = db
    .prepare(`
      SELECT 1 FROM ecosystem_species WHERE ecosystem_slug = ? AND species_slug = ?
      UNION
      SELECT 1 FROM ecosystem_factors WHERE ecosystem_slug = ? AND factor_slug = ?
    `)
    .get(ecosystem, from, ecosystem, to);
  if (!nodeExists) {
    return response.status(400).json({ message: "关系两端的节点必须先加入该生态系统" });
  }

  const duplicated = db
    .prepare("SELECT 1 FROM relationships WHERE ecosystem_slug = ? AND from_slug = ? AND to_slug = ? AND type = ?")
    .get(ecosystem, from, to, type);
  if (duplicated) return response.status(409).json({ message: "该关系已存在" });

  const result = db
    .prepare("INSERT INTO relationships (ecosystem_slug, from_slug, to_slug, type, note) VALUES (?, ?, ?, ?, ?)")
    .run(ecosystem, from, to, type, note ?? null);
  return response.status(201).json({ id: result.lastInsertRowid, ecosystem, from, to, type, note });
});

router.delete("/relationships/:id", (request, response) => {
  const result = db.prepare("DELETE FROM relationships WHERE id = ?").run(Number(request.params.id));
  if (result.changes === 0) return response.status(404).json({ message: "Relationship not found" });
  return response.json({ deleted: Number(request.params.id) });
});

export default router;
