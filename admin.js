const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = id => document.getElementById(id);
const loginCard = $("loginCard"), app = $("app"), loginStatus = $("loginStatus"), formStatus = $("formStatus"), list = $("productList");
let editingId = null;

async function boot() {
  const { data: { session } } = await client.auth.getSession();
  if (session) showApp(); else showLogin();
  client.auth.onAuthStateChange((_event, session) => session ? showApp() : showLogin());
}
function showLogin() { loginCard.hidden = false; app.hidden = true; $("logout").hidden = true; }
function showApp() { loginCard.hidden = true; app.hidden = false; $("logout").hidden = false; loadProducts(); }

$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  loginStatus.textContent = "Entrando...";
  const { error } = await client.auth.signInWithPassword({
    email: $("email").value.trim(),
    password: $("password").value
  });
  loginStatus.textContent = error ? error.message : "";
});
$("logout").addEventListener("click", () => client.auth.signOut());
$("productForm").addEventListener("submit", saveProduct);
$("cancelBtn").addEventListener("click", resetForm);

async function saveProduct(e) {
  e.preventDefault();
  formStatus.textContent = "Guardando...";
  const payload = {
    title: $("title").value.trim(),
    description: $("description").value.trim(),
    price: $("price").value.trim() || null,
    category: $("category").value.trim(),
    image_url: $("image_url").value.trim(),
    link: $("link").value.trim(),
    badge: $("badge").value.trim(),
    active: $("active").value === "true"
  };
  let result;
  if (editingId) result = await client.from("products").update(payload).eq("id", editingId);
  else result = await client.from("products").insert(payload);
  if (result.error) { formStatus.textContent = result.error.message; return; }
  formStatus.textContent = "Producto guardado correctamente.";
  resetForm();
  loadProducts();
}

async function loadProducts() {
  list.innerHTML = "Cargando...";
  const { data, error } = await client.from("products").select("*");
  if (error) { list.innerHTML = "<p>" + escapeHtml(error.message) + "</p>"; return; }
  if (!data.length) { list.innerHTML = "<p class='muted'>Todavía no tienes productos.</p>"; return; }
  list.innerHTML = data.map(p => `
    <div class="product-row">
      <div class="row-info">
        <img class="thumb" src="${escapeAttr(p.image_url || "")}" onerror="this.style.display='none'">
        <div><strong>${escapeHtml(p.title)}</strong>
        <div class="muted">${escapeHtml(p.category || "Sin categoría")} · ${escapeHtml(p.price ?? "Sin precio")} · ${p.active ? "Visible" : "Oculto"}</div></div>
      </div>
      <div class="actions">
        <button class="btn2 secondary" onclick="editProduct('${p.id}')">Editar</button>
        <button class="btn2 danger" onclick="deleteProduct('${p.id}')">Eliminar</button>
      </div>
    </div>`).join("");
  window._products = data;
}
window.editProduct = id => {
  const p = (window._products || []).find(x => x.id === id);
  if (!p) return;
  editingId = id;
  $("formTitle").textContent = "Editar producto";
  $("cancelBtn").hidden = false;
  ["title","description","price","category","image_url","link","badge"].forEach(k => $(k).value = p[k] ?? "");
  $("active").value = String(p.active);
  window.scrollTo({top:0,behavior:"smooth"});
};
window.deleteProduct = async id => {
  if (!confirm("¿Eliminar este producto?")) return;
  const { error } = await client.from("products").delete().eq("id", id);
  if (error) alert(error.message); else loadProducts();
};
function resetForm() {
  editingId = null; $("productForm").reset(); $("active").value = "true";
  $("formTitle").textContent = "Añadir producto"; $("cancelBtn").hidden = true;
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, char => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"
  }[char]));
}
function escapeAttr(value) { return escapeHtml(value); }
boot();
