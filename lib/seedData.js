export const monthlyStages = [
  { key: "agendamento", label: "Agendamento", color: "#A98B5D" },
  { key: "planejamento", label: "Reunião & Planejamento", color: "#7A5C3E" },
  { key: "producao", label: "Produção", color: "#5C7A5E" },
  { key: "postagem", label: "Postagem", color: "#3E6B7A" },
  { key: "analise", label: "Análise do mês", color: "#7A2233" }
];

export const demandStages = [
  { key: "pauta", label: "Pauta" },
  { key: "roteiro", label: "Roteiro/Copy" },
  { key: "producao", label: "Produção" },
  { key: "revisao", label: "Revisão" },
  { key: "aprovacao_cliente", label: "Aprovação cliente" },
  { key: "publicado", label: "Publicado" }
];

export const tabs = [
  { key: "clientes", label: "Clientes" },
  { key: "processo", label: "Processo do mês" },
  { key: "demandas", label: "Demandas" },
  { key: "pauta", label: "Pauta do dia" },
  { key: "calendario", label: "Calendário" },
  { key: "equipe", label: "Equipe" }
];

const clientNames = [
  "Ateliê Eliane Ribeiro",
  "Cheiro Verde",
  "Claudia Móveis",
  "Dra. Beatriz Zamboni",
  "Encantos da Mesa",
  "Fernanda Scaliante",
  "Forest Park",
  "Geisse",
  "Haut Consórcios",
  "Kopenhagen",
  "Moove",
  "Natália Ports",
  "NM Engenharia",
  "Rafaela Panucci",
  "Sebastian",
  "Trio",
  "We Bilingual",
  "Daniela",
  "Milane & Moro"
];

export const clients = clientNames.map((name, index) => ({
  id: `c${index}`,
  name,
  drive: index < 5 ? `drive.google.com/verve/${slugify(name)}` : "",
  docs: index < 5 ? `docs.google.com/verve/${slugify(name)}` : "",
  instagram: index < 5 ? `@${name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "")}` : "",
  stage: ["agendamento", "planejamento", "producao", "producao", "postagem", "analise"][index % 6],
  createdAt: new Date()
}));

export const team = [
  { id: "t1", name: "Bruna", area: "Gestão", email: "bruna@verve.com.br" },
  { id: "t2", name: "Mayara", area: "Social media", email: "mayara@verve.com.br" },
  { id: "t3", name: "Luiza", area: "Edição de vídeo", email: "luiza@verve.com.br" },
  { id: "t4", name: "Naara", area: "Design", email: "naara@verve.com.br" }
];

export const demands = [
  { id: "d1", client: "Sebastian", title: "2 conteúdos - campanha julho", respId: "t2", stage: "roteiro", deadline: "2026-07-09", done: false },
  { id: "d2", client: "Forest Park", title: "Edição - gravação com Vanessa", respId: "t3", stage: "producao", deadline: "2026-07-08", done: false },
  { id: "d3", client: "Ateliê Eliane Ribeiro", title: "Agendar captação", respId: "", stage: "pauta", deadline: "2026-07-15", done: false },
  { id: "d4", client: "Dra. Beatriz Zamboni", title: "Entregar vídeos editados", respId: "t3", stage: "revisao", deadline: "2026-07-05", done: false },
  { id: "d5", client: "Moove", title: "Calendário editorial", respId: "t4", stage: "aprovacao_cliente", deadline: "2026-07-08", done: false },
  { id: "d6", client: "We Bilingual", title: "Selecionar Friday Memes", respId: "t2", stage: "publicado", deadline: "2026-07-01", done: true }
].map((demand) => ({ ...demand, createdAt: new Date() }));

export const metricsHistory = [
  {
    clientId: "c0",
    history: [
      { m: "Fev", followers: 1180, reach: 4200, likes: 210, comments: 18, saves: 34, shares: 9, visits: 96, posts: 8 },
      { m: "Mar", followers: 1240, reach: 4850, likes: 265, comments: 24, saves: 41, shares: 12, visits: 118, posts: 9 },
      { m: "Abr", followers: 1310, reach: 5300, likes: 298, comments: 29, saves: 52, shares: 15, visits: 134, posts: 10 },
      { m: "Mai", followers: 1395, reach: 6100, likes: 340, comments: 33, saves: 61, shares: 19, visits: 157, posts: 9 },
      { m: "Jun", followers: 1460, reach: 6700, likes: 378, comments: 38, saves: 70, shares: 22, visits: 172, posts: 11 }
    ]
  },
  {
    clientId: "c6",
    history: [
      { m: "Fev", followers: 3200, reach: 9800, likes: 410, comments: 22, saves: 58, shares: 14, visits: 210, posts: 6 },
      { m: "Mar", followers: 3410, reach: 10900, likes: 465, comments: 27, saves: 66, shares: 18, visits: 245, posts: 7 },
      { m: "Abr", followers: 3680, reach: 12400, likes: 520, comments: 31, saves: 79, shares: 21, visits: 289, posts: 8 },
      { m: "Mai", followers: 3920, reach: 14100, likes: 598, comments: 39, saves: 94, shares: 27, visits: 334, posts: 8 },
      { m: "Jun", followers: 4230, reach: 15600, likes: 672, comments: 45, saves: 108, shares: 33, visits: 378, posts: 9 }
    ]
  },
  {
    clientId: "c3",
    history: [
      { m: "Fev", followers: 5100, reach: 18200, likes: 880, comments: 64, saves: 150, shares: 40, visits: 520, posts: 12 },
      { m: "Mar", followers: 5340, reach: 19500, likes: 940, comments: 70, saves: 168, shares: 45, visits: 560, posts: 13 },
      { m: "Abr", followers: 5590, reach: 20100, likes: 965, comments: 68, saves: 172, shares: 44, visits: 545, posts: 11 },
      { m: "Mai", followers: 5810, reach: 22300, likes: 1050, comments: 79, saves: 198, shares: 52, visits: 610, posts: 14 },
      { m: "Jun", followers: 6020, reach: 24800, likes: 1180, comments: 88, saves: 225, shares: 58, visits: 670, posts: 13 }
    ]
  }
];

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
