const $ = id => document.getElementById(id);
let client = null;
let editingId = null;

function showSystemError(message) {
  const box = $("systemError");
  if (box) {
    box.hidden = false;
    box.textContent = "Error del sistema: " + message;
  }
}

function init() {
  try {
    if (!window.supabase) throw new Error("No se cargó la biblioteca de Supabase.");
    if (typeof SUPABASE_URL === "undefined" || typeof SUPABASE_PUBLISHABLE_KEY === "undefined") {
      throw new Error("Falta la configuración de Supabase.");
    }
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    bindEvents();
    boot();
  } catch (e) {
    console.error(e);
    showSystemError(e.message || String(e));
  }
}

function bindEvents() {
  $("loginForm").addEventListener("submit", login);
  $("logout").addEventListener("click", () => client.auth.signOut());
  $("productForm").addEventListener("submit", saveProduct);
  $("cancelBtn").addEventListener("click", resetForm);
}

async function boot() {
  try {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (data && data.session) showApp(); else showLogin();
    client.auth.onAuthStateChange((_event, session) => {
      if (session) showApp(); else showLogin();
    });
  } catch (e) {
    console.error(e);
    showLogin();
    $("loginStatus").textContent = "No se pudo comprobar la sesión: " + (e.message || e);
  }
}

function showLogin() {
  $("loginCard").hidden = false;
  $("app").hidden = true;
  $("logout").hidden = true;
}

function showApp() {
  $("loginCard").hidden = true;
  $("app").hidden = false;
  $("logout").hidden = false;
  loadProducts();
}

async function login(e) {
  e.preventDefault();
  const status = $("loginStatus");
  const button = e.submitter || $("loginForm").querySelector('button[type="submit"]');
  status.textContent = "Entrando...";
  if (button) button.disabled = true;
  try {
    const email = $("email").value.trim();
    const password = $("password").value;
    if (!email || !password) throw new Error("Ingresa tu correo y contraseña.");
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data || !data.session) throw new Error("Supabase no creó una sesión. Verifica el usuario en Authentication > Users.");
    status.textContent = "Acceso correcto.";
  } catch (e) {
    console.error(e);
    status.textContent = "No se pudo ingresar: " + (e.message || String(e));
  } finally {
    if (button) button.disabled = false;
  }
}

async function saveProduct(e) {
  e.preventDefault();
  $("formStatus").textContent = "Guardando...";
  const payload = {
    title: $("title").value.trim(),
    description: $("description").value.trim(),
    price: $("price").value.trim() || null,
    currency: $("currency").value,
    category: $("category").value.trim(),
    image_url: $("image_url").value.trim(),
    link: $("link").value.trim(),
    badge: $("badge").value.trim(),
    active: $("active").value === "true"
  };
  try {
    const result = editingId
      ? await client.from("products").update(payload).eq("id", editingId)
      : await client.from("products").insert(payload);
    if (result.error) throw result.error;
    $("formStatus").textContent = "Producto guardado correctamente.";
    resetForm();
    loadProducts();
  } catch (e) {
    $("formStatus").textContent = "Error: " + (e.message || String(e));
  }
}

async function loadProducts() {
  $("productList").innerHTML = "Cargando...";
  try {
    const { data, error } = await client.from("products").select("*").order("title");
    if (error) throw error;
    if (!data || !data.length) {
      $("productList").innerHTML = "<p class='muted'>Todavía no tienes productos.</p>";
      return;
    }
    window._products = data;
    $("productList").innerHTML = data.map(p => `
      <div class="product-row">
        <div class="row-info">
          <img class="thumb" src="${escapeAttr(p.image_url || "")}" onerror="this.style.display='none'">
          <div><strong>${escapeHtml(p.title)}</strong>
          <div class="muted">${escapeHtml(p.category || "Sin categoría")} · ${escapeHtml(formatPrice(p.price, p.currency))} · ${p.active ? "Visible" : "Oculto"}</div></div>
        </div>
        <div class="actions">
          <button class="btn2 secondary" onclick="editProduct('${p.id}')">Editar</button>
          <button class="btn2 danger" onclick="deleteProduct('${p.id}')">Eliminar</button>
        </div>
      </div>`).join("");
  } catch (e) {
    $("productList").innerHTML = "<p class='error-box'>Error: " + escapeHtml(e.message || e) + "</p>";
  }
}

window.editProduct = id => {
  const p = (window._products || []).find(x => x.id === id);
  if (!p) return;
  editingId = id;
  $("formTitle").textContent = "Editar producto";
  $("cancelBtn").hidden = false;
  ["title","description","price","category","image_url","link","badge"].forEach(k => $(k).value = p[k] ?? "");
  $("active").value = String(p.active);
  $("currency").value = p.currency || "PEN";
  window.scrollTo({top:0, behavior:"smooth"});
};

window.deleteProduct = async id => {
  if (!confirm("¿Eliminar este producto?")) return;
  try {
    const { error } = await client.from("products").delete().eq("id", id);
    if (error) throw error;
    loadProducts();
  } catch (e) {
    alert("Error: " + (e.message || e));
  }
};

function resetForm() {
  editingId = null;
  $("productForm").reset();
  $("active").value = "true";
  $("currency").value = "PEN";
  $("formTitle").textContent = "Añadir producto";
  $("cancelBtn").hidden = true;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;"
  }[char]));
}
function escapeAttr(value) { return escapeHtml(value); }
function formatPrice(price, currency) {
  if (price === null || price === undefined || price === "") return "Sin precio";
  const symbol = currency === "USD" ? "US$" : "S/";
  return symbol + " " + Number(price).toFixed(2);
}

init();