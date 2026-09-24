let dados = {};
let registros = [];
let categorias = [];
let imagens = [];
let imagensUsuarios = [];
let usuariosSistema = [];
let configuracao = {};
let registroVisualizado = null;
let fotoUsuarioLeitura = "";

const $ = (id) => document.getElementById(id);

function toast(msg, erro = false) {
  const t = $("toast");
  t.textContent = msg;
  t.className = "toast show";
  t.style.borderColor = erro ? "#7f1d1d" : "#263244";
  setTimeout(() => t.classList.remove("show"), 2800);
}

function esc(v) {
  const d = document.createElement("div");
  d.textContent = v ?? "";
  return d.innerHTML;
}

function imgSrc(v) {
  if (!v) return "";
  return v.startsWith("data:") ? v : `data:image/*;base64,${String(v).replace(/\s/g, "")}`;
}

async function texto(url) {
  const r = await fetch(url);
  if (!r.ok) throw Error(`Nao foi possivel carregar ${url}`);
  return r.text();
}

async function carregar() {
  try {
    dados = JSON.parse((await texto("dados.json")).replace(/^\uFEFF/, ""));
    configuracao = dados.configuracao || {};
    categorias = Array.isArray(dados.categorias) ? dados.categorias : [];
    registros = Array.isArray(dados.registros) ? dados.registros : [];
    usuariosSistema = Array.isArray(dados.usuarios) ? dados.usuarios : [];
    imagens = await carregarImagensUsadas("imagens", nomesImagensGerais());
    imagensUsuarios = await carregarImagensUsadas("imagens_usuarios", nomesImagensUsuarios());
    fotoUsuarioLeitura = await carregarFotoUsuarioLeitura();
    renderTudo();
  } catch (e) {
    toast(e.message, true);
  }
}

async function carregarFotoUsuarioLeitura() {
  try {
    return (await texto("foto_usuario/usuario.txt")).trim();
  } catch (e) {
    return "";
  }
}

function nomesImagensGerais() {
  return [...new Set([
    ...categorias.map((item) => item.imagemArquivo),
    ...registros.map((item) => item.imagemArquivo),
    "login_imagem.txt"
  ].filter(Boolean))];
}

function nomesImagensUsuarios() {
  return [...new Set(usuariosSistema.map((item) => item.imagemArquivo).filter(Boolean))];
}

async function carregarImagensUsadas(pasta, nomes) {
  const carregadas = [];
  for (const nome of nomes) {
    try {
      carregadas.push({ nome, base64: (await texto(`${pasta}/${encodeURIComponent(nome)}`)).trim() });
    } catch (e) {
      carregadas.push({ nome, base64: "" });
    }
  }
  return carregadas;
}

function imagem(nome) {
  return imagens.find((item) => item.nome === nome)?.base64 || "";
}

function imagemUsuario(nome) {
  return imagensUsuarios.find((item) => item.nome === nome)?.base64 || "";
}

function categoriaNome(id) {
  return categorias.find((x) => String(x.id) === String(id))?.nome || "Sem categoria";
}

function categoriaEhSqlServer(id) {
  return categoriaNome(id).toUpperCase() === "SQLSERVER";
}

function sqlCores() {
  return configuracao.sqlCores || {
    palavraChave: "#60a5fa",
    texto: "#e2e8f0",
    numero: "#f59e0b",
    string: "#22c55e",
    comentario: "#64748b",
    funcao: "#c084fc"
  };
}

function destacarSql(textoSql) {
  const cores = sqlCores();
  const palavras = new Set("SELECT FROM WHERE JOIN LEFT RIGHT INNER OUTER ON INSERT UPDATE DELETE CREATE ALTER DROP TABLE VIEW PROCEDURE FUNCTION EXEC VALUES INTO SET DECLARE BEGIN END IF ELSE WHILE GROUP BY ORDER HAVING DISTINCT TOP AND OR NOT NULL IS AS IN LIKE BETWEEN UNION ALL".split(" "));
  const tokens = String(textoSql || "").match(/(--.*$)|('[^']*')|(\b\d+(\.\d+)?\b)|(\b[A-Za-z_][A-Za-z0-9_]*\b)|(\s+)|./gmi) || [];
  return tokens.map((token, index, lista) => {
    const upper = token.toUpperCase();
    const prox = lista[index + 1] || "";
    if (/^--/.test(token)) return `<span style="color:${cores.comentario}">${esc(token)}</span>`;
    if (/^'/.test(token)) return `<span style="color:${cores.string}">${esc(token)}</span>`;
    if (/^\d/.test(token)) return `<span style="color:${cores.numero}">${esc(token)}</span>`;
    if (palavras.has(upper)) return `<span style="color:${cores.palavraChave};font-weight:700">${esc(token)}</span>`;
    if (/^[A-Za-z_]/.test(token) && prox === "(") return `<span style="color:${cores.funcao}">${esc(token)}</span>`;
    return `<span style="color:${cores.texto}">${esc(token)}</span>`;
  }).join("");
}

function renderDadoRegistro(registro) {
  return categoriaEhSqlServer(registro.categoriaId) ? `<pre class="sql-code">${destacarSql(registro.dado)}</pre>` : esc(registro.dado);
}

function renderTudo() {
  renderCategoriasSelect();
  renderTabela();
  renderCategorias();
  renderGaleriaImagens();
  renderGaleriaImagensUsuarios();
  $("totalRegistros").textContent = registros.length;
  $("totalCategorias").textContent = categorias.length;
  $("totalComImagem").textContent = registros.filter((x) => imagem(x.imagemArquivo)).length;
  $("avatarLeitura").innerHTML = fotoUsuarioLeitura ? `<img src="${imgSrc(fotoUsuarioLeitura)}" alt="">` : "M";
}

function renderCategoriasSelect() {
  const f = $("filtroCategoria");
  const valor = f.value;
  f.innerHTML = '<option value="">Selecione uma categoria</option>' + categorias.map((x) => `<option value="${x.id}">${esc(x.nome)}</option>`).join("");
  f.value = valor;
}

function registrosDaCategoriaSelecionada() {
  const f = $("filtroCategoria").value;
  const q = $("campoBusca").value.toLowerCase();
  if (!f) return null;
  return registros.filter((x) =>
    String(x.categoriaId) === String(f) &&
    (!q || [x.titulo, x.observacao, x.dado, categoriaNome(x.categoriaId)].some((v) => String(v || "").toLowerCase().includes(q)))
  );
}

function renderTabela() {
  const lista = registrosDaCategoriaSelecionada();
  if (!lista) {
    $("contadorRegistros").textContent = "Selecione uma categoria";
    $("tabelaRegistros").innerHTML = '<tr><td colspan="6" class="empty-state">Selecione uma categoria para visualizar a listagem.</td></tr>';
    return;
  }

  $("contadorRegistros").textContent = `${lista.length} registro${lista.length !== 1 ? "s" : ""}`;
  $("tabelaRegistros").innerHTML = lista.length ? lista.map((x) => {
    const base64 = imagem(x.imagemArquivo);
    const im = base64 ? `<img class="thumb" src="${imgSrc(base64)}" alt="">` : '<span class="sem-img">-</span>';
    return `<tr><td data-label="Imagem">${im}</td><td data-label="Titulo"><b>${esc(x.titulo)}</b></td><td data-label="Categoria"><span class="tag">${esc(categoriaNome(x.categoriaId))}</span></td><td data-label="Observacao">${esc(x.observacao || "-")}</td><td data-label="Dado" class="dado-cell ${categoriaEhSqlServer(x.categoriaId) ? "sql-cell" : ""}" title="${esc(x.dado)}">${renderDadoRegistro(x)}</td><td data-label="Acoes"><div class="acoes-tabela"><button class="secondary" onclick="visualizarRegistro('${x.id}')">Ver</button><button class="secondary" onclick="copiarRegistro('${x.id}')">Copiar</button></div></td></tr>`;
  }).join("") : '<tr><td colspan="6" class="empty-state">Nenhum registro encontrado nesta categoria.</td></tr>';
}

function renderCategorias() {
  $("listaCategorias").innerHTML = categorias.length ? categorias.map((c) => {
    const qtd = registros.filter((r) => String(r.categoriaId) === String(c.id)).length;
    const base64 = imagem(c.imagemArquivo);
    return `<div class="category-card"><div class="category-head">${base64 ? `<img class="category-img" src="${imgSrc(base64)}" alt="">` : '<div class="category-img"></div>'}<div class="category-name">${esc(c.nome)}</div></div><div class="category-count">${qtd} registro${qtd !== 1 ? "s" : ""}</div><div class="category-actions"><button class="btn secondary small" onclick="selecionarCategoria('${c.id}')">Listar</button></div></div>`;
  }).join("") : '<div class="empty-inline">Nenhuma categoria publicada.</div>';
}

function renderGaleriaImagens() {
  $("listaImagens").innerHTML = imagens.length ? imagens.map((item, index) => {
    const preview = item.base64 ? `<img src="${imgSrc(item.base64)}" alt="">` : '<div class="image-empty">Sem conteudo</div>';
    const botao = item.base64 ? `<button class="btn secondary small" onclick="visualizarImagem(${index}, 'geral')">Visualizar</button>` : "";
    return `<div class="image-card"><div class="image-card-preview">${preview}</div><div class="image-card-body"><b>${esc(item.nome)}</b><small>${item.base64 ? `${item.base64.length} caracteres Base64` : "Arquivo vazio ou ausente"}</small><div class="category-actions">${botao}</div></div></div>`;
  }).join("") : '<div class="empty-inline">Nenhuma imagem usada nos dados publicados.</div>';
}

function renderGaleriaImagensUsuarios() {
  $("listaImagensUsuarios").innerHTML = imagensUsuarios.length ? imagensUsuarios.map((item, index) => {
    const usuarioVinculado = usuariosSistema.find((usuario) => usuario.imagemArquivo === item.nome);
    const preview = item.base64 ? `<img src="${imgSrc(item.base64)}" alt="">` : '<div class="image-empty">Sem conteudo</div>';
    const botao = item.base64 ? `<button class="btn secondary small" onclick="visualizarImagem(${index}, 'usuario')">Visualizar</button>` : "";
    return `<div class="image-card"><div class="image-card-preview">${preview}</div><div class="image-card-body"><b>${esc(item.nome)}</b><small>${usuarioVinculado ? "Vinculada a " + esc(usuarioVinculado.usuario) : "Nao vinculada"}</small><div class="category-actions">${botao}</div></div></div>`;
  }).join("") : '<div class="empty-inline">Nenhuma foto de usuario publicada.</div>';
}

function selecionarCategoria(id) {
  $("filtroCategoria").value = id;
  navegar("registros");
  renderTabela();
}

function visualizarRegistro(id) {
  const r = registros.find((x) => String(x.id) === String(id));
  if (!r) return;
  registroVisualizado = id;
  $("visualTitulo").textContent = r.titulo;
  $("visualCategoria").textContent = categoriaNome(r.categoriaId);
  $("visualObservacao").textContent = r.observacao || "-";
  $("visualDado").innerHTML = categoriaEhSqlServer(r.categoriaId) ? destacarSql(r.dado) : esc(r.dado || "");
  $("visualDado").classList.toggle("sql-code", categoriaEhSqlServer(r.categoriaId));
  const base64 = imagem(r.imagemArquivo);
  $("visualImagem").innerHTML = base64 ? `<img src="${imgSrc(base64)}" alt="">` : "";
  $("visualImagem").classList.toggle("hidden", !base64);
  abrir("modalVisualizarRegistro");
}

function visualizarImagem(index, tipo) {
  const item = tipo === "usuario" ? imagensUsuarios[index] : imagens[index];
  if (!item || !item.base64) return;
  $("tituloModalImagem").textContent = item.nome;
  $("imagemModalPreview").innerHTML = `<img src="${imgSrc(item.base64)}" alt="">`;
  abrir("modalImagem");
}

function abrir(id) { $(id).classList.remove("hidden"); }
function fechar(id) { $(id).classList.add("hidden"); }

async function copiarTexto(texto) {
  const valor = String(texto || "");
  try {
    await navigator.clipboard.writeText(valor);
  } catch (e) {
    const area = document.createElement("textarea");
    area.value = valor;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
  toast("Texto copiado para a area de transferencia.");
}

function copiarRegistro(id) {
  const registro = registros.find((item) => String(item.id) === String(id));
  if (!registro) return;
  copiarTexto(registro.dado);
}

function copiarRegistroVisualizado() {
  copiarRegistro(registroVisualizado);
}

function navegar(sec) {
  document.querySelectorAll(".menu-item").forEach((b) => b.classList.toggle("active", b.dataset.section === sec));
  $("sectionRegistros").classList.toggle("hidden", sec !== "registros");
  $("sectionCategorias").classList.toggle("hidden", sec !== "categorias");
  $("sectionImagens").classList.toggle("hidden", sec !== "imagens");
  $("sectionImagensUsuarios").classList.toggle("hidden", sec !== "imagensUsuarios");
  $("paginaTitulo").textContent = sec === "registros" ? "Registros" : sec === "categorias" ? "Categorias" : sec === "imagens" ? "Imagens" : "Fotos usuarios";
  $("paginaDescricao").textContent = sec === "registros" ? "Selecione uma categoria para consultar os registros." : sec === "categorias" ? "Lista das categorias publicadas." : sec === "imagens" ? "Arquivos Base64 publicados junto ao pacote estatico." : "Arquivos Base64 da pasta imagens_usuarios.";
}

$("btnAtualizar").onclick = carregar;
$("campoBusca").oninput = renderTabela;
$("filtroCategoria").onchange = renderTabela;
$("btnFecharVisualizacao").onclick = () => fechar("modalVisualizarRegistro");
$("btnCancelarVisualizacao").onclick = () => fechar("modalVisualizarRegistro");
$("btnCopiarDaVisualizacao").onclick = copiarRegistroVisualizado;
$("btnFecharModalImagem").onclick = () => fechar("modalImagem");
$("btnCancelarImagem").onclick = () => fechar("modalImagem");
document.querySelectorAll(".menu-item").forEach((b) => b.onclick = () => navegar(b.dataset.section));
window.onclick = (e) => { if (e.target.classList.contains("modal")) e.target.classList.add("hidden"); };

carregar();
