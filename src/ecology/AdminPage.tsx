import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  api,
  type Ecosystem,
  type EcosystemInput,
  type Relationship,
  type RelationshipInput,
  type Species,
  type SpeciesInput,
  type WebNode
} from "../api";

/**
 * 数据管理后台：物种、生态系统、关系统一维护。
 * 物种与生态系统是多对多关系，同一物种可复用于多个生态系统。
 */

type Tab = "ecosystems" | "species" | "relationships";

const emptyEcosystem: EcosystemInput = {
  slug: "", name: "", englishName: "", description: "", climate: "", color: "#8fd8a8", icon: "trees", position: 99
};

const emptySpecies: SpeciesInput = {
  slug: "", name: "", latinName: "", role: "producer", trophicLevel: 1, description: "", ecosystems: []
};

const ROLE_OPTIONS = [
  { value: "producer", label: "生产者" },
  { value: "consumer", label: "消费者" },
  { value: "decomposer", label: "分解者" }
] as const;

const TYPE_OPTIONS = [
  { value: "energy", label: "能量流动（食物 → 捕食者）" },
  { value: "decomposition", label: "分解回归（有机体 → 分解者）" },
  { value: "support", label: "环境支持（环境因素 → 生物）" }
] as const;

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("ecosystems");
  const [ecosystems, setEcosystems] = useState<Ecosystem[]>([]);
  const [species, setSpecies] = useState<Species[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = () => {
    Promise.all([api.ecosystems(), api.speciesList()])
      .then(([eco, sp]) => { setEcosystems(eco); setSpecies(sp); })
      .catch((error) => setNotice(error.message));
  };

  useEffect(reload, []);

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3200);
  };

  return (
    <section className="admin-page">
      <header className="admin-head">
        <p className="eyebrow">DATA STUDIO / 数据管理</p>
        <h1>生态系统数据后台</h1>
        <p>物种、生态系统与关系统一存储。物种只需维护一次，即可被多个生态系统复用。</p>
        <nav className="admin-tabs">
          {([["ecosystems", "生态系统"], ["species", "物种"], ["relationships", "关系"]] as Array<[Tab, string]>).map(([key, label]) => (
            <button key={key} className={tab === key ? "is-active" : ""} onClick={() => setTab(key)}>{label}</button>
          ))}
        </nav>
        {notice && <p className="admin-notice">{notice}</p>}
      </header>

      {tab === "ecosystems" && <EcosystemAdmin ecosystems={ecosystems} onChanged={reload} flash={flash} />}
      {tab === "species" && <SpeciesAdmin ecosystems={ecosystems} species={species} onChanged={reload} flash={flash} />}
      {tab === "relationships" && <RelationshipAdmin ecosystems={ecosystems} flash={flash} />}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 生态系统管理                                                        */
/* ------------------------------------------------------------------ */

function EcosystemAdmin({
  ecosystems, onChanged, flash
}: { ecosystems: Ecosystem[]; onChanged: () => void; flash: (m: string) => void }) {
  const [form, setForm] = useState<EcosystemInput>(emptyEcosystem);
  const [editing, setEditing] = useState<string | null>(null);

  const set = (patch: Partial<EcosystemInput>) => setForm((current) => ({ ...current, ...patch }));

  const submit = async () => {
    try {
      if (editing) {
        await api.updateEcosystem(editing, form);
        flash(`已更新生态系统「${form.name}」`);
      } else {
        await api.createEcosystem(form);
        flash(`已创建生态系统「${form.name}」，现在可以为其添加物种与关系`);
      }
      setForm(emptyEcosystem);
      setEditing(null);
      onChanged();
    } catch (error) {
      flash((error as Error).message);
    }
  };

  const remove = async (slug: string, name: string) => {
    if (!window.confirm(`确定删除生态系统「${name}」？其中的成员关系与关系数据将一并移除，物种本身保留。`)) return;
    try {
      await api.deleteEcosystem(slug);
      flash(`已删除生态系统「${name}」`);
      if (editing === slug) { setEditing(null); setForm(emptyEcosystem); }
      onChanged();
    } catch (error) {
      flash((error as Error).message);
    }
  };

  return (
    <div className="admin-grid">
      <div className="admin-form">
        <h2>{editing ? `编辑：${editing}` : "新建生态系统"}</h2>
        <label>标识（英文小写）<input value={form.slug} disabled={!!editing} onChange={(e) => set({ slug: e.target.value })} placeholder="如 tundra" /></label>
        <label>名称<input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="如 苔原生态系统" /></label>
        <label>英文名<input value={form.englishName} onChange={(e) => set({ englishName: e.target.value })} placeholder="Tundra" /></label>
        <label>描述<textarea rows={3} value={form.description} onChange={(e) => set({ description: e.target.value })} /></label>
        <label>气候特征<input value={form.climate} onChange={(e) => set({ climate: e.target.value })} /></label>
        <div className="form-row">
          <label>主题色<input type="color" value={form.color} onChange={(e) => set({ color: e.target.value })} /></label>
          <label>图标
            <select value={form.icon} onChange={(e) => set({ icon: e.target.value })}>
              <option value="trees">树木</option><option value="wheat">禾草</option>
              <option value="waves">波浪</option><option value="droplets">水滴</option>
            </select>
          </label>
          <label>排序<input type="number" value={form.position} onChange={(e) => set({ position: Number(e.target.value) })} /></label>
        </div>
        <div className="form-actions">
          <button className="primary" onClick={submit}><Plus size={15} /> {editing ? "保存修改" : "创建生态系统"}</button>
          {editing && <button onClick={() => { setEditing(null); setForm(emptyEcosystem); }}>取消编辑</button>}
        </div>
      </div>

      <div className="admin-list">
        {ecosystems.map((eco) => (
          <div className="admin-row" key={eco.slug}>
            <i style={{ background: eco.color }} />
            <div>
              <strong>{eco.name}</strong>
              <small>{eco.slug} · {eco.species_count} 物种 / {eco.link_count} 关系 / {eco.factor_count} 环境因素</small>
            </div>
            <button className="icon-button" aria-label="编辑" onClick={() => {
              setEditing(eco.slug);
              setForm({
                slug: eco.slug, name: eco.name, englishName: eco.english_name,
                description: eco.description, climate: eco.climate, color: eco.color,
                icon: eco.icon, position: eco.position
              });
            }}><Pencil size={15} /></button>
            <button className="icon-button danger" aria-label="删除" onClick={() => remove(eco.slug, eco.name)}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 物种管理                                                            */
/* ------------------------------------------------------------------ */

function SpeciesAdmin({
  ecosystems, species, onChanged, flash
}: { ecosystems: Ecosystem[]; species: Species[]; onChanged: () => void; flash: (m: string) => void }) {
  const [form, setForm] = useState<SpeciesInput>(emptySpecies);
  const [editing, setEditing] = useState<string | null>(null);

  const set = (patch: Partial<SpeciesInput>) => setForm((current) => ({ ...current, ...patch }));
  const toggleEcosystem = (slug: string) =>
    set({
      ecosystems: form.ecosystems?.includes(slug)
        ? form.ecosystems.filter((item) => item !== slug)
        : [...(form.ecosystems ?? []), slug]
    });

  const submit = async () => {
    try {
      if (editing) {
        await api.updateSpecies(editing, form);
        flash(`已更新物种「${form.name}」`);
      } else {
        await api.createSpecies(form);
        flash(`已创建物种「${form.name}」`);
      }
      setForm(emptySpecies);
      setEditing(null);
      onChanged();
    } catch (error) {
      flash((error as Error).message);
    }
  };

  const remove = async (slug: string, name: string) => {
    if (!window.confirm(`确定删除物种「${name}」？其在各生态系统中的关系将一并移除。`)) return;
    try {
      await api.deleteSpecies(slug);
      flash(`已删除物种「${name}」`);
      onChanged();
    } catch (error) {
      flash((error as Error).message);
    }
  };

  return (
    <div className="admin-grid">
      <div className="admin-form">
        <h2>{editing ? `编辑：${editing}` : "录入新物种"}</h2>
        <label>标识（英文小写）<input value={form.slug} disabled={!!editing} onChange={(e) => set({ slug: e.target.value })} placeholder="如 lynx" /></label>
        <label>中文名<input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="如 猞猁" /></label>
        <label>拉丁学名<input value={form.latinName} onChange={(e) => set({ latinName: e.target.value })} placeholder="Lynx lynx" /></label>
        <div className="form-row">
          <label>生态角色
            <select value={form.role} onChange={(e) => set({ role: e.target.value as SpeciesInput["role"] })}>
              {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>营养级<input type="number" min={0} max={6} value={form.trophicLevel} onChange={(e) => set({ trophicLevel: Number(e.target.value) })} /></label>
        </div>
        <label>描述<textarea rows={3} value={form.description} onChange={(e) => set({ description: e.target.value })} /></label>
        <fieldset className="eco-picker">
          <legend>所属生态系统（可多选，即组件复用）</legend>
          {ecosystems.map((eco) => (
            <label key={eco.slug}>
              <input type="checkbox" checked={form.ecosystems?.includes(eco.slug) ?? false} onChange={() => toggleEcosystem(eco.slug)} />
              {eco.name}
            </label>
          ))}
        </fieldset>
        <div className="form-actions">
          <button className="primary" onClick={submit}><Plus size={15} /> {editing ? "保存修改" : "录入物种"}</button>
          {editing && <button onClick={() => { setEditing(null); setForm(emptySpecies); }}>取消编辑</button>}
        </div>
      </div>

      <div className="admin-list">
        {species.map((item) => (
          <div className="admin-row" key={item.slug}>
            <i className={`role-dot role-${item.role}`} />
            <div>
              <strong>{item.name}</strong>
              <small>
                {item.slug} · {ROLE_OPTIONS.find((o) => o.value === item.role)?.label} · 营养级 {item.trophic_level}
                {item.ecosystems.length > 0 && ` · 属于 ${item.ecosystems.join(" / ")}`}
              </small>
            </div>
            <button className="icon-button" aria-label="编辑" onClick={() => {
              setEditing(item.slug);
              setForm({
                slug: item.slug, name: item.name, latinName: item.latin_name, role: item.role,
                trophicLevel: item.trophic_level, description: item.description, ecosystems: item.ecosystems
              });
            }}><Pencil size={15} /></button>
            <button className="icon-button danger" aria-label="删除" onClick={() => remove(item.slug, item.name)}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 关系管理                                                            */
/* ------------------------------------------------------------------ */

function RelationshipAdmin({ ecosystems, flash }: { ecosystems: Ecosystem[]; flash: (m: string) => void }) {
  const [ecosystem, setEcosystem] = useState(ecosystems[0]?.slug ?? "");
  const [nodes, setNodes] = useState<WebNode[]>([]);
  const [links, setLinks] = useState<Relationship[]>([]);
  const [form, setForm] = useState<Omit<RelationshipInput, "ecosystem">>({ from: "", to: "", type: "energy", note: "" });

  useEffect(() => {
    if (!ecosystem && ecosystems.length) setEcosystem(ecosystems[0].slug);
  }, [ecosystems, ecosystem]);

  const reload = () => {
    if (!ecosystem) return;
    Promise.all([api.ecosystem(ecosystem), api.relationships(ecosystem)])
      .then(([detail, relations]) => { setNodes(detail.nodes); setLinks(relations); })
      .catch((error) => flash(error.message));
  };
  useEffect(reload, [ecosystem]);

  const nameOf = useMemo(() => {
    const map = new Map(nodes.map((node) => [node.id, node.name]));
    return (id: string) => map.get(id) ?? id;
  }, [nodes]);

  const submit = async () => {
    try {
      await api.createRelationship({ ...form, ecosystem });
      flash(`已在「${ecosystem}」中建立关系：${nameOf(form.from)} → ${nameOf(form.to)}`);
      setForm({ from: "", to: "", type: "energy", note: "" });
      reload();
    } catch (error) {
      flash((error as Error).message);
    }
  };

  const remove = async (id: number) => {
    try {
      await api.deleteRelationship(id);
      flash("关系已删除");
      reload();
    } catch (error) {
      flash((error as Error).message);
    }
  };

  return (
    <div className="admin-grid">
      <div className="admin-form">
        <h2>建立关系</h2>
        <label>所属生态系统
          <select value={ecosystem} onChange={(e) => setEcosystem(e.target.value)}>
            {ecosystems.map((eco) => <option key={eco.slug} value={eco.slug}>{eco.name}</option>)}
          </select>
        </label>
        <label>关系类型
          <select value={form.type} onChange={(e) => setForm((c) => ({ ...c, type: e.target.value as RelationshipInput["type"] }))}>
            {TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>起点（能量 / 物质流出方）
          <select value={form.from} onChange={(e) => setForm((c) => ({ ...c, from: e.target.value }))}>
            <option value="">选择节点</option>
            {nodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}
          </select>
        </label>
        <label>终点（能量 / 物质流入方）
          <select value={form.to} onChange={(e) => setForm((c) => ({ ...c, to: e.target.value }))}>
            <option value="">选择节点</option>
            {nodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}
          </select>
        </label>
        <label>备注<input value={form.note ?? ""} onChange={(e) => setForm((c) => ({ ...c, note: e.target.value }))} placeholder="可选，如「须鲸滤食」" /></label>
        <div className="form-actions">
          <button className="primary" disabled={!form.from || !form.to} onClick={submit}><Plus size={15} /> 建立关系</button>
        </div>
      </div>

      <div className="admin-list">
        {links.map((link) => (
          <div className="admin-row" key={link.id}>
            <i className={`link-dot link-${link.type}`} />
            <div>
              <strong>{nameOf(link.from)} → {nameOf(link.to)}</strong>
              <small>{TYPE_OPTIONS.find((o) => o.value === link.type)?.label}{link.note ? ` · ${link.note}` : ""}</small>
            </div>
            <button className="icon-button danger" aria-label="删除" onClick={() => remove(link.id)}><Trash2 size={15} /></button>
          </div>
        ))}
        {links.length === 0 && <p className="admin-empty">该生态系统暂无关系数据。</p>}
      </div>
    </div>
  );
}
