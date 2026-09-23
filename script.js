const grid=document.getElementById("products");
const offers=document.getElementById("offers");
const noOffers=document.getElementById("noOffers");
const search=document.getElementById("search");
const categories=document.getElementById("categories");
const empty=document.getElementById("empty");
document.getElementById("year").textContent=new Date().getFullYear();
let activeCategory="Todos";
let products=[];
const fallbackProducts=window.products||[];

async function loadProducts(){
  try{
    const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
    const {data,error}=await client.from("products").select("id,title,description,price,currency,category,image_url,link,badge,active").eq("active",true);
    if(error) throw error;
    products=(!data||!data.length)
      ? fallbackProducts.map(p=>({...p,currency:p.currency||"PEN"}))
      : data.map(p=>({title:p.title,description:p.description,price:p.price,currency:p.currency||"PEN",category:p.category,image:p.image_url,link:p.link,badge:p.badge}));
  }catch(e){
    products=fallbackProducts;
    console.warn("No se pudo cargar Supabase; usando productos locales.",e);
  }
  buildCategories();
  renderOffers();
  render();
}
function buildCategories(){
  const categoryList=["Todos",...new Set(products.map(p=>p.category).filter(Boolean))];
  categories.innerHTML=categoryList.map(c=>"<button class=\"filter "+(c==="Todos"?"active":"")+"\" data-category=\""+escapeAttr(c)+"\">"+escapeHtml(c)+"</button>").join("");
}
categories.addEventListener("click",e=>{
  const btn=e.target.closest(".filter"); if(!btn)return;
  activeCategory=btn.dataset.category;
  document.querySelectorAll(".filter").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active"); render();
});
search.addEventListener("input",render);

function isOffer(p){
  const value=((p.badge||"")+" "+(p.category||"")).toLowerCase();
  return value.includes("oferta")||value.includes("promo")||value.includes("descuento");
}
function card(p){
  return "<article class=\"product"+(isOffer(p)?" offer-card":"")+"\"><div class=\"product-img\">"+(p.image?"<img src=\""+escapeAttr(p.image)+"\" alt=\""+escapeAttr(p.title)+"\" loading=\"lazy\">":"<span>IKMA</span>")+"</div><div class=\"product-body\"><span class=\"badge\">"+escapeHtml(p.badge||p.category||"PRODUCTO")+"</span><h3>"+escapeHtml(p.title)+"</h3><p>"+escapeHtml(p.description||"")+"</p><div class=\"product-bottom\"><span class=\"price\">"+escapeHtml(formatPrice(p.price,p.currency))+"</span><a class=\"buy\" href=\""+escapeAttr(p.link||"#")+" \" target=\"_blank\" rel=\"noopener noreferrer\">Ver producto</a></div></div></article>";
}
function renderOffers(){
  const offerProducts=products.filter(isOffer).slice(0,3);
  noOffers.classList.toggle("hidden",offerProducts.length>0);
  offers.classList.toggle("hidden",offerProducts.length===0);
  offers.innerHTML=offerProducts.map(card).join("");
}
function render(){
  const term=search.value.trim().toLowerCase();
  const filtered=products.filter(p=>{
    const matchesCategory=activeCategory==="Todos"||p.category===activeCategory;
    const text=[p.title,p.description,p.category,p.badge].join(" ").toLowerCase();
    return matchesCategory&&text.includes(term);
  });
  empty.classList.toggle("hidden",filtered.length>0);
  grid.innerHTML=filtered.map(card).join("");
}
function formatPrice(price,currency){
  if(price===null||price===undefined||price==="")return "Consultar";
  return (currency==="USD"?"US$":"S/")+" "+Number(price).toFixed(2);
}
function escapeHtml(value){return String(value??"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[m]))}
function escapeAttr(value){return escapeHtml(value)}
loadProducts();