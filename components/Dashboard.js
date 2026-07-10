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
  const [calCursor, setCalCursor] = useState(() => {
    const today = new Date();
    return { y: today.getFullYear(), m: today.getMonth() };
  });
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
  const currentUser = data?.currentUser;
  const isAdmin = currentUser?.role === "admin";
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
        clientId: client.id,
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

  async function addClient(formData) {
    const name = formData.get("name")?.trim();
    if (!name) return;

    const response = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        drive: formData.get("drive"),
        docs: formData.get("docs"),
        instagram: formData.get("instagram")
      })
    });
    const created = await response.json();

    if (!response.ok) {
      setError(created.error || "Erro ao criar cliente.");
      return;
    }

    setData((prev) => ({ ...prev, clients: [...prev.clients, created] }));
    setSelectedClient(created.id);
  }

  async function removeClient(client) {
    const confirmed = window.confirm(`Remover ${client.name}? As demandas deste cliente tambem serao removidas.`);
    if (!confirmed) return;

    setSaving(client.id, true);

    try {
      const response = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Erro ao remover cliente.");

      setData((prev) => {
        const clients = prev.clients.filter((item) => item.id !== client.id);
        setSelectedClient((current) => (current === client.id ? clients[0]?.id || "" : current));

        return {
          ...prev,
          clients,
          demands: prev.demands.filter((demand) => demand.clientId !== client.id && demand.client !== client.name),
          metricsHistory: Object.fromEntries(
            Object.entries(prev.metricsHistory).filter(([clientId]) => clientId !== client.id)
          )
        };
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(client.id, false);
    }
  }

  async function addTeamMember(formData) {
    const payload = {
      name: formData.get("name"),
      area: formData.get("area"),
      email: formData.get("email"),
      role: formData.get("role"),
      password: formData.get("password")
    };

    const response = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const created = await response.json();

    if (!response.ok) {
      setError(created.error || "Erro ao criar membro.");
      return false;
    }

    setData((prev) => ({ ...prev, team: sortTeam([...prev.team, created]) }));
    return true;
  }

  async function updateTeamMember(memberId, formData) {
    const payload = {
      name: formData.get("name"),
      area: formData.get("area"),
      email: formData.get("email"),
      role: formData.get("role"),
      password: formData.get("password")
    };

    const response = await fetch(`/api/team/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const updated = await response.json();

    if (!response.ok) {
      setError(updated.error || "Erro ao atualizar membro.");
      return false;
    }

    setData((prev) => ({
      ...prev,
      team: sortTeam(prev.team.map((member) => (member.id === memberId ? updated : member)))
    }));
    return true;
  }

  async function removeTeamMember(member) {
    const confirmed = window.confirm(`Remover ${member.name} da equipe?`);
    if (!confirmed) return;

    const response = await fetch(`/api/team/${member.id}`, { method: "DELETE" });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error || "Erro ao remover membro.");
      return;
    }

    setData((prev) => ({ ...prev, team: prev.team.filter((item) => item.id !== member.id) }));
  }

  function moveClient(client, direction) {
    const stages = data.monthlyStages;
    const index = stages.findIndex((stage) => stage.key === client.stage);
    const next = (index + direction + stages.length) % stages.length;
    patchClientStage(client.id, stages[next].key);
  }

  function moveCalendar(direction) {
    setCalCursor((current) => {
      const next = new Date(current.y, current.m + direction, 1);
      return { y: next.getFullYear(), m: next.getMonth() };
    });
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
          onAddClient={addClient}
          onAddDemand={addDemand}
          onRemoveClient={removeClient}
          onSelectClient={setSelectedClient}
          onSetStage={patchClientStage}
          onToggleDone={(demand, done) => patchDemand(demand.id, { done })}
          selectedClient={selected.id}
          team={data.team}
          teamById={teamById}
        />
      ) : null}
      {currentTab === "clientes" && !selected ? (
        <ClientesEmpty onAddClient={addClient} />
      ) : null}
      {currentTab === "processo" ? (
        <Processo clients={data.clients} monthlyStages={data.monthlyStages} moveClient={moveClient} savingIds={savingIds} />
      ) : null}
      {currentTab === "demandas" ? (
        <Demandas demands={data.demands} onToggleDone={(demand, done) => patchDemand(demand.id, { done })} teamById={teamById} />
      ) : null}
      {currentTab === "pauta" ? <Pauta demands={data.demands} teamById={teamById} /> : null}
      {currentTab === "calendario" ? <Calendario calCursor={calCursor} demands={data.demands} onMoveMonth={moveCalendar} /> : null}
      {currentTab === "equipe" ? (
        <Equipe
          currentUser={currentUser}
          isAdmin={isAdmin}
          onAddMember={addTeamMember}
          onRemoveMember={removeTeamMember}
          onUpdateMember={updateTeamMember}
          team={data.team}
        />
      ) : null}
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
    onAddClient,
    onAddDemand,
    onRemoveClient,
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
        <AddClientForm onAddClient={onAddClient} />
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
        <div className="detail-head">
          <h1 className="detail-title">{client.name}</h1>
          <button className="btn danger-btn" onClick={() => onRemoveClient(client)} type="button">
            Remover cliente
          </button>
        </div>

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
          demands={demands.filter((demand) => demand.clientId === client.id || demand.client === client.name)}
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

function ClientesEmpty({ onAddClient }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <p className="side-eyebrow">Clientes (0)</p>
        <AddClientForm onAddClient={onAddClient} />
      </aside>
      <main className="main">
        <p className="empty-note">Nenhum cliente cadastrado ainda.</p>
      </main>
    </div>
  );
}

function AddClientForm({ onAddClient }) {
  function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    onAddClient(new FormData(form));
    form.reset();
  }

  return (
    <form className="client-form" onSubmit={handleSubmit}>
      <input className="form-input" name="name" placeholder="Nome do cliente" />
      <input className="form-input" name="drive" placeholder="Drive" />
      <input className="form-input" name="docs" placeholder="Docs" />
      <input className="form-input" name="instagram" placeholder="Instagram" />
      <button className="btn" type="submit">Adicionar cliente</button>
    </form>
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

function Demandas({ demands, onToggleDone, teamById }) {
  const today = todayString();
  const dueToday = demands.filter((demand) => !demand.done && demand.deadline === today);
  const overdue = demands.filter((demand) => !demand.done && demand.deadline && demand.deadline < today);

  return (
    <main className="main">
      <h1 className="detail-title">Demandas</h1>
      <DemandList
        demands={dueToday}
        emptyText="Nenhuma demanda para entregar hoje."
        onToggleDone={onToggleDone}
        teamById={teamById}
        title="Para entregar hoje"
      />
      <DemandList
        demands={overdue}
        emptyText="Nenhuma demanda atrasada."
        onToggleDone={onToggleDone}
        teamById={teamById}
        title="Atrasadas"
      />
    </main>
  );
}

function DemandList({ demands, emptyText, onToggleDone, teamById, title }) {
  return (
    <section className="demand-section">
      <p className="section-title">{title} ({demands.length})</p>
      {demands.length ? (
        demands.map((demand) => (
          <div className="item-row" key={demand.id}>
            <input checked={demand.done} onChange={(event) => onToggleDone(demand, event.target.checked)} type="checkbox" />
            <span style={{ flex: 1 }}>
              <strong>{demand.client}</strong> - {demand.title}
            </span>
            <StatusBadge demand={demand} />
            {demand.respId ? <span className="item-responsible">{teamById.get(demand.respId)?.name}</span> : null}
            {demand.deadline ? <span style={{ color: "var(--vinho)", fontFamily: "IBM Plex Mono", fontSize: 10 }}>{formatDate(demand.deadline)}</span> : null}
          </div>
        ))
      ) : (
        <p className="empty-note">{emptyText}</p>
      )}
    </section>
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

function Calendario({ calCursor, demands, onMoveMonth }) {
  const first = new Date(calCursor.y, calCursor.m, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(calCursor.y, calCursor.m + 1, 0).getDate();
  const cells = [...Array(startDay).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const toDateString = (day) => `${calCursor.y}-${String(calCursor.m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return (
    <main className="main">
      <div className="calendar-head">
        <button aria-label="Mês anterior" className="icon-btn" onClick={() => onMoveMonth(-1)} title="Mês anterior" type="button">‹</button>
        <h1 className="detail-title">{monthNames[calCursor.m]} {calCursor.y}</h1>
        <button aria-label="Próximo mês" className="icon-btn" onClick={() => onMoveMonth(1)} title="Próximo mês" type="button">›</button>
      </div>
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
              <div className="calendar-day-head">
                <span>{day}</span>
                {items.length ? <span className={`calendar-badge ${overdue ? "overdue" : ""}`}>{items.length}</span> : null}
              </div>
              {items.length ? (
                <div className="calendar-demand-list">
                  {items.map((demand) => (
                    <div className="calendar-demand" key={demand.id}>
                      <strong>{demand.client}</strong>
                      <span>{demand.title}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </main>
  );
}

function Equipe({ currentUser, isAdmin, onAddMember, onRemoveMember, onUpdateMember, team }) {
  return (
    <main className="main">
      <div className="detail-head">
        <h1 className="detail-title">Equipe</h1>
        {currentUser ? <span className="item-responsible">{currentUser.role === "admin" ? "Admin" : "Membro"}</span> : null}
      </div>
      {isAdmin ? <TeamForm mode="create" onSubmit={onAddMember} /> : null}
      {team.map((member) => (
        <TeamMemberRow
          canEdit={isAdmin}
          currentUser={currentUser}
          key={member.id}
          member={member}
          onRemoveMember={onRemoveMember}
          onUpdateMember={onUpdateMember}
        />
      ))}
    </main>
  );
}

function TeamForm({ member, mode, onCancel, onSubmit }) {
  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const ok = await onSubmit(new FormData(form));
    if (ok && mode === "create") form.reset();
    if (ok && onCancel) onCancel();
  }

  return (
    <form className={`team-form ${mode === "create" ? "create" : ""}`} onSubmit={handleSubmit}>
      <input className="form-input" defaultValue={member?.name || ""} name="name" placeholder="Nome" required />
      <input className="form-input" defaultValue={member?.area || ""} name="area" placeholder="Área" />
      <input className="form-input" defaultValue={member?.email || ""} name="email" placeholder="E-mail" required type="email" />
      <select className="form-input" defaultValue={member?.role || "member"} name="role">
        <option value="member">Membro</option>
        <option value="admin">Admin</option>
      </select>
      <input
        autoComplete="new-password"
        className="form-input"
        name="password"
        placeholder={mode === "create" ? "Senha inicial" : "Nova senha (opcional)"}
        required={mode === "create"}
        type="password"
      />
      <div className="team-form-actions">
        <button className="btn" type="submit">{mode === "create" ? "Adicionar membro" : "Salvar"}</button>
        {onCancel ? <button className="btn" onClick={onCancel} type="button">Cancelar</button> : null}
      </div>
    </form>
  );
}

function TeamMemberRow({ canEdit, currentUser, member, onRemoveMember, onUpdateMember }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="team-panel">
        <TeamForm
          member={member}
          mode="edit"
          onCancel={() => setEditing(false)}
          onSubmit={(formData) => onUpdateMember(member.id, formData)}
        />
      </div>
    );
  }

  return (
    <div className="team-row">
      <span>{member.name}</span>
      <span>{member.area || "Sem área"}</span>
      <span>{member.email}</span>
      <span className={`role-badge ${member.role === "admin" ? "admin" : ""}`}>
        {member.role === "admin" ? "Admin" : "Membro"}
      </span>
      {canEdit ? (
        <span className="team-actions">
          <button className="btn" onClick={() => setEditing(true)} type="button">Editar</button>
          <button
            className="btn danger-btn"
            disabled={currentUser?.id === member.id}
            onClick={() => onRemoveMember(member)}
            type="button"
          >
            Remover
          </button>
        </span>
      ) : null}
    </div>
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

function sortTeam(team) {
  return [...team].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function isOverdue(value) {
  if (!value) return false;
  return value < todayString();
}

function todayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
