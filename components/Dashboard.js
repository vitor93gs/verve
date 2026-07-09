"use client";

import { useEffect, useMemo, useState } from "react";

const statusLabels = { afazer: "A fazer", atrasado: "Atrasado", concluido: "Concluído" };
const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [currentTab, setCurrentTab] = useState("clientes");
  const [selectedClient, setSelectedClient] = useState("c0");
  const [calCursor] = useState({ y: 2026, m: 6 });
  const [savingIds, setSavingIds] = useState(new Set());

  useEffect(() => {
    fetch("/api/bootstrap")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Não foi possível carregar o painel.");
        return payload;
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  const selected = data?.clients.find((client) => client.id === selectedClient) || data?.clients[0];
  const teamById = useMemo(() => new Map((data?.team || []).map((member) => [member.id, member])), [data?.team]);

  async function patchClientStage(clientId, stage) {
    setSaving(clientId, true);
    setData((prev) => ({
      ...prev,
      clients: prev.clients.map((client) => (client.id === clientId ? { ...client, stage } : client))
    }));

    try {
      const response = await fetch(`/api/clients/${clientId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage })
      });
      const updated = await response.json();
      if (!response.ok) throw new Error(updated.error || "Erro ao atualizar cliente.");
      setData((prev) => ({
        ...prev,
        clients: prev.clients.map((client) => (client.id === clientId ? updated : client))
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(clientId, false);
    }
  }

  async function patchDemand(demandId, update) {
    setSaving(demandId, true);
    setData((prev) => ({
      ...prev,
      demands: prev.demands.map((demand) => (demand.id === demandId ? { ...demand, ...update } : demand))
    }));

    try {
      const response = await fetch(`/api/demands/${demandId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update)
      });
      const updated = await response.json();
      if (!response.ok) throw new Error(updated.error || "Erro ao atualizar demanda.");
      setData((prev) => ({
        ...prev,
        demands: prev.demands.map((demand) => (demand.id === demandId ? updated : demand))
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(demandId, false);
    }
  }

  async function addDemand(client, formData) {
    const title = formData.get("title")?.trim();
    if (!title) return;

    const response = await fetch("/api/demands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client: client.name,
        title,
        respId: formData.get("respId"),
        deadline: formData.get("deadline")
      })
    });
    const created = await response.json();

    if (!response.ok) {
      setError(created.error || "Erro ao criar demanda.");
      return;
    }

    setData((prev) => ({ ...prev, demands: [...prev.demands, created] }));
  }

  function moveClient(client, direction) {
    const stages = data.monthlyStages;
    const index = stages.findIndex((stage) => stage.key === client.stage);
    const next = (index + direction + stages.length) % stages.length;
    patchClientStage(client.id, stages[next].key);
  }

  function setSaving(id, isSaving) {
    setSavingIds((prev) => {
      const next = new Set(prev);
      if (isSaving) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.reload();
  }

  if (error && !data) {
    return <main className="error">{error}</main>;
  }

  if (!data) {
    return <main className="loading">Carregando painel...</main>;
  }

  return (
    <>
      <div className="preview-banner">Painel conectado ao MongoDB - edições são persistidas no banco configurado</div>
      <header className="topbar">
        <div className="brand">
          <Logo />
          <div>
            <span className="word">verve marketing</span>
            <br />
            <span className="sub">Painel administrativo</span>
          </div>
        </div>
        <nav className="tabs" aria-label="Seções do painel">
          {data.tabs.map((tab) => (
            <button
              className={`tab-btn ${currentTab === tab.key ? "active" : ""}`}
              key={tab.key}
              onClick={() => setCurrentTab(tab.key)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
          <button className="tab-btn logout-btn" onClick={logout} type="button">
            Sair
          </button>
        </nav>
      </header>
      {error ? <p className="error">{error}</p> : null}
      {currentTab === "clientes" && selected ? (
        <Clientes
          client={selected}
          clients={data.clients}
          demands={data.demands}
          metricsHistory={data.metricsHistory}
          monthlyStages={data.monthlyStages}
          onAddDemand={addDemand}
          onSelectClient={setSelectedClient}
          onSetStage={patchClientStage}
          onToggleDone={(demand, done) => patchDemand(demand.id, { done })}
          selectedClient={selected.id}
          team={data.team}
          teamById={teamById}
        />
      ) : null}
      {currentTab === "processo" ? (
        <Processo clients={data.clients} monthlyStages={data.monthlyStages} moveClient={moveClient} savingIds={savingIds} />
      ) : null}
      {currentTab === "demandas" ? (
        <Demandas demandStages={data.demandStages} demands={data.demands} teamById={teamById} />
      ) : null}
      {currentTab === "pauta" ? <Pauta demands={data.demands} teamById={teamById} /> : null}
      {currentTab === "calendario" ? <Calendario calCursor={calCursor} demands={data.demands} /> : null}
      {currentTab === "equipe" ? <Equipe team={data.team} /> : null}
    </>
  );
}

function Clientes(props) {
  const {
    client,
    clients,
    demands,
    metricsHistory,
    monthlyStages,
    onAddDemand,
    onSelectClient,
    onSetStage,
    onToggleDone,
    selectedClient,
    team,
    teamById
  } = props;
  const history = metricsHistory[client.id];

  return (
    <div className="shell">
      <aside className="sidebar">
        <p className="side-eyebrow">Clientes ({clients.length})</p>
        {clients.map((item) => (
          <div
            className={`client-item ${item.id === selectedClient ? "active" : ""}`}
            key={item.id}
            onClick={() => onSelectClient(item.id)}
            role="button"
            tabIndex={0}
          >
            {item.name}
          </div>
        ))}
      </aside>
      <main className="main">
        <h1 className="detail-title">{client.name}</h1>

        <p className="section-title">Status do cliente</p>
        <div className="stage-pills">
          {monthlyStages.map((stage) => (
            <button
              className="stage-pill"
              key={stage.key}
              onClick={() => onSetStage(client.id, stage.key)}
              style={client.stage === stage.key ? { background: stage.color, borderColor: stage.color, color: "#fff" } : undefined}
              type="button"
            >
              {stage.label}
            </button>
          ))}
        </div>
        <p className="empty-note">Este status sincroniza com o quadro "Processo do mês".</p>

        <p className="section-title">Acessos</p>
        <div className="link-grid">
          <LinkCard label="Drive" value={client.drive} />
          <LinkCard label="Docs" value={client.docs} />
          <LinkCard label="Instagram" value={client.instagram} />
        </div>

        <p className="section-title">Demandas deste cliente</p>
        <ClientDemands
          client={client}
          demands={demands.filter((demand) => demand.client === client.name)}
          onAddDemand={onAddDemand}
          onToggleDone={onToggleDone}
          team={team}
          teamById={teamById}
        />

        <p className="section-title">Insights do Instagram</p>
        {history ? <Insights history={history} /> : <p className="empty-note">Nenhum mês registrado ainda para este cliente.</p>}
      </main>
    </div>
  );
}

function LinkCard({ label, value }) {
  return (
    <div className="link-card">
      <div className="link-label">{label}</div>
      <div className="link-value" style={!value ? { color: "var(--ink-soft)" } : undefined}>
        {value || "Não adicionado"}
      </div>
    </div>
  );
}

function ClientDemands({ client, demands, onAddDemand, onToggleDone, team, teamById }) {
  function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    onAddDemand(client, new FormData(form));
    form.reset();
  }

  return (
    <>
      <div>
        {demands.length ? (
          demands.map((demand) => (
            <div className="item-row" key={demand.id}>
              <input checked={demand.done} onChange={(event) => onToggleDone(demand, event.target.checked)} type="checkbox" />
              <span style={demand.done ? { color: "var(--ink-soft)", flex: 1, textDecoration: "line-through" } : { flex: 1 }}>
                {demand.title}
              </span>
              <StatusBadge demand={demand} />
              {demand.respId ? <span className="item-responsible">{teamById.get(demand.respId)?.name}</span> : null}
              {demand.deadline ? <span style={{ color: "var(--vinho)", fontFamily: "IBM Plex Mono", fontSize: 10 }}>{formatDate(demand.deadline)}</span> : null}
              {demand.respId && !demand.done ? <button className="btn" type="button">Notificar</button> : null}
            </div>
          ))
        ) : (
          <p className="empty-note">Nenhuma demanda registrada para este cliente ainda.</p>
        )}
      </div>
      <form
        className="add-item-row"
        onSubmit={handleSubmit}
        style={{ marginTop: "0.8rem" }}
      >
        <input className="form-input grow" name="title" placeholder="Ex.: Vídeos liberados para edição" />
        <select className="form-input" name="respId">
          <option value="">Sem responsável</option>
          {team.map((member) => (
            <option key={member.id} value={member.id}>{member.name}</option>
          ))}
        </select>
        <input className="form-input" name="deadline" type="date" />
        <button className="btn" type="submit">Adicionar</button>
      </form>
    </>
  );
}

function Processo({ clients, monthlyStages, moveClient, savingIds }) {
  return (
    <main className="main">
      <p className="section-title" style={{ marginTop: 0 }}>
        {"Agendamento -> Reunião & Planejamento -> Produção -> Postagem -> Análise do mês"}
      </p>
      <div className="board">
        {monthlyStages.map((stage) => (
          <div className="board-col" key={stage.key}>
            <p className="board-col-title">{stage.label}</p>
            {clients.filter((client) => client.stage === stage.key).map((client) => (
              <div className="board-card" key={client.id}>
                <div className="board-card-name">{client.name}</div>
                <div className="board-card-actions">
                  <button className="icon-btn" disabled={savingIds.has(client.id)} onClick={() => moveClient(client, -1)} title="Voltar etapa" type="button">‹</button>
                  <button className="icon-btn" disabled={savingIds.has(client.id)} onClick={() => moveClient(client, 1)} title="Avançar etapa" type="button">›</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}

function Demandas({ demandStages, demands, teamById }) {
  return (
    <main className="main">
      <div className="board demandas">
        {demandStages.map((stage) => (
          <div className="board-col" key={stage.key}>
            <p className="board-col-title">{stage.label}</p>
            {demands.filter((demand) => demand.stage === stage.key).map((demand) => (
              <div className="board-card" key={demand.id}>
                <div style={{ color: "var(--vinho)", fontFamily: "IBM Plex Mono", fontSize: 8, textTransform: "uppercase" }}>{demand.client}</div>
                <div className="board-card-name">{demand.title}</div>
                {demand.respId ? <span className="item-responsible">{teamById.get(demand.respId)?.name}</span> : null}
                <div className="board-card-actions">
                  <button className="btn" type="button">Notificar</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}

function Pauta({ demands, teamById }) {
  const grouped = demands.filter((demand) => !demand.done).reduce((acc, demand) => {
    acc[demand.client] = acc[demand.client] || [];
    acc[demand.client].push(demand);
    return acc;
  }, {});

  return (
    <main className="main">
      {Object.entries(grouped).map(([client, items]) => (
        <div className="pauta-client" key={client}>
          <div className="pauta-client-name">{client}</div>
          {items.map((demand) => (
            <div className="pauta-item" key={demand.id}>
              <StatusBadge demand={demand} />
              <span>
                {demand.title}
                {demand.respId ? <> - <span className="item-responsible">{teamById.get(demand.respId)?.name}</span></> : null}
                {demand.deadline ? <> - <strong>{formatDate(demand.deadline)}</strong></> : null}
              </span>
            </div>
          ))}
        </div>
      ))}
    </main>
  );
}

function Calendario({ calCursor, demands }) {
  const first = new Date(calCursor.y, calCursor.m, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(calCursor.y, calCursor.m + 1, 0).getDate();
  const cells = [...Array(startDay).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const toDateString = (day) => `${calCursor.y}-${String(calCursor.m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return (
    <main className="main">
      <h1 className="detail-title">{monthNames[calCursor.m]} {calCursor.y}</h1>
      <div className="calendar-grid">
        {weekdays.map((weekday) => <div className="calendar-weekday" key={weekday}>{weekday}</div>)}
      </div>
      <div className="calendar-grid">
        {cells.map((day, index) => {
          if (day === null) return <div className="calendar-cell empty" key={`empty-${index}`} />;
          const dateString = toDateString(day);
          const items = demands.filter((demand) => demand.deadline === dateString);
          const overdue = items.some((demand) => !demand.done && isOverdue(dateString));
          return (
            <div className="calendar-cell" key={dateString}>
              {day}
              {items.length ? <div className={`calendar-badge ${overdue ? "overdue" : ""}`}>{items.length}</div> : null}
            </div>
          );
        })}
      </div>
    </main>
  );
}

function Equipe({ team }) {
  return (
    <main className="main">
      {team.map((member) => (
        <div className="team-row" key={member.id}>
          <span>{member.name}</span>
          <span>{member.area}</span>
          <span>{member.email}</span>
        </div>
      ))}
    </main>
  );
}

function Insights({ history }) {
  const last = history[history.length - 1];
  const prev = history[history.length - 2];
  const engagementLast = engagementRate(last);
  const engagementPrev = prev ? engagementRate(prev) : null;
  const kpis = [
    { label: "Seguidores", value: formatNumber(last.followers), delta: prev ? delta(last.followers, prev.followers) : null },
    { label: "Alcance", value: formatNumber(last.reach), delta: prev ? delta(last.reach, prev.reach) : null },
    { label: "Interações", value: formatNumber(interactions(last)), delta: prev ? delta(interactions(last), interactions(prev)) : null },
    { label: "Engajamento", value: `${engagementLast.toFixed(1)}%`, delta: engagementPrev ? delta(engagementLast, engagementPrev) : null },
    { label: "Visitas ao perfil", value: formatNumber(last.visits), delta: prev ? delta(last.visits, prev.visits) : null },
    { label: "Posts no mês", value: last.posts, delta: prev ? delta(last.posts, prev.posts) : null }
  ];

  return (
    <>
      <div className="kpi-grid">
        {kpis.map((kpi) => (
          <div className="kpi-card" key={kpi.label}>
            <div className="kpi-label">{kpi.label}</div>
            <div className="kpi-value">{kpi.value}</div>
            <DeltaBadge value={kpi.delta} />
          </div>
        ))}
      </div>
      <div className="mini-chart-row">
        <LineChart color="#4A382D" data={history} label="Seguidores" valueKey="followers" />
        <LineChart color="#3E6B7A" data={history} label="Alcance" valueKey="reach" />
        <LineChart color="#550B18" data={history} formatter={(value) => `${value.toFixed(1)}%`} label="Engajamento %" valueKey={engagementRate} />
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="metrics-table">
          <thead>
            <tr>
              <th>Mês</th><th>Seguidores</th><th>Alcance</th><th>Curtidas</th><th>Coment.</th><th>Salvos</th><th>Compart.</th><th>Visitas</th><th>Posts</th><th>Engaj.</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.m}>
                <td>{row.m}</td>
                <td>{formatNumber(row.followers)}</td>
                <td>{formatNumber(row.reach)}</td>
                <td>{row.likes}</td>
                <td>{row.comments}</td>
                <td>{row.saves}</td>
                <td>{row.shares}</td>
                <td>{row.visits}</td>
                <td>{row.posts}</td>
                <td>{engagementRate(row).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function LineChart({ color, data, formatter, label, valueKey }) {
  const w = 300;
  const h = 110;
  const pad = 24;
  const values = data.map((row) => (typeof valueKey === "function" ? valueKey(row) : row[valueKey]));
  const max = Math.max(...values) * 1.15 || 1;
  const min = Math.min(0, Math.min(...values));
  const step = (w - pad * 2) / (data.length - 1);
  const points = values.map((value, index) => [
    pad + index * step,
    h - pad - ((value - min) / (max - min || 1)) * (h - pad * 2)
  ]);
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${point[0].toFixed(1)},${point[1].toFixed(1)}`).join(" ");
  const last = values[values.length - 1];

  return (
    <div className="mini-chart">
      <div className="mini-chart-head">
        <span>{label}</span>
        <strong style={{ color }}>{formatter ? formatter(last) : last}</strong>
      </div>
      <svg style={{ height: "auto", width: "100%" }} viewBox={`0 0 ${w} ${h}`}>
        <path d={path} fill="none" stroke={color} strokeWidth="2" />
        {points.map((point, index) => <circle cx={point[0]} cy={point[1]} fill={color} key={data[index].m} r="2.6" />)}
        {data.map((row, index) => (
          <text fill="var(--ink-soft)" fontFamily="IBM Plex Mono" fontSize="8" key={row.m} textAnchor="middle" x={pad + index * step} y={h - 4}>
            {row.m}
          </text>
        ))}
      </svg>
    </div>
  );
}

function StatusBadge({ demand }) {
  const state = demand.done ? "concluido" : isOverdue(demand.deadline) ? "atrasado" : "afazer";
  return <span className={`status-badge ${state}`}>{statusLabels[state]}</span>;
}

function DeltaBadge({ value }) {
  if (value === null || value === undefined) return null;
  const isUp = value >= 0;
  return <span className={`kpi-delta ${isUp ? "up" : "down"}`}>{isUp ? "▲" : "▼"} {Math.abs(value).toFixed(0)}%</span>;
}

function Logo() {
  return (
    <svg className="mark" height="24" viewBox="0 0 100 100" width="24" aria-hidden="true">
      {[0, 60, 120, 180, 240, 300].map((rotation) => (
        <path d="M47 8 L53 8 L53 38 L47 38 Z" key={rotation} transform={`rotate(${rotation} 50 50)`} />
      ))}
    </svg>
  );
}

function interactions(row) {
  return row.likes + row.comments + row.saves + row.shares;
}

function engagementRate(row) {
  return row.reach ? (interactions(row) / row.reach) * 100 : 0;
}

function delta(current, previous) {
  return ((current - previous) / previous) * 100;
}

function formatNumber(value) {
  return value.toLocaleString("pt-BR");
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function isOverdue(value) {
  if (!value) return false;
  const today = new Date().toISOString().slice(0, 10);
  return value < today;
}
