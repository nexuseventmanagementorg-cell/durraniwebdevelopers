const products = [
  {id:"gulnaar",name:"Gulnaar Garden",type:"unstitched",tag:"NEW SEASON",description:"Three-piece lawn · embroidered details",price:18500,image:"photo-1610030469983-98e550d6193c"},
  {id:"neelam",name:"Neelam Evening",type:"stitched",tag:"MADE TO ORDER",description:"Chiffon formal · hand-finished",price:26500,image:"photo-1597983073493-88cd35cf93b0"},
  {id:"gulabi",name:"Gulabi Dhoop",type:"unstitched",tag:"EASY EVERYDAY",description:"Lawn cotton · soft block print",price:14800,image:"photo-1617627143750-d86bc21e42bb"},
  {id:"sahar",name:"Sahar-e-Gul",type:"stitched",tag:"CUSTOM FIT",description:"Lawn set · relaxed silhouette",price:22000,image:"photo-1594633312681-425c7b97ccd1"},
  {id:"mehr",name:"Mehr Embroidered",type:"unstitched",tag:"LIMITED EDITION",description:"Organza accents · three-piece set",price:24000,image:"photo-1583391733958-6c78276477e8"},
  {id:"zari",name:"Zari Festive",type:"stitched",tag:"OCCASIONWEAR",description:"Formal ensemble · detailed finish",price:34000,image:"photo-1610030469983-98e550d6193c"}
];
const countries = {
  PK:{name:"Pakistan",currency:"PKR",rate:1,delivery:[["TCS · Nationwide",650],["Leopards · Nationwide",550]]},
  US:{name:"United States",currency:"USD",rate:278,delivery:[["DHL Express · estimate",42],["UPS Worldwide · estimate",38]]},
  GB:{name:"United Kingdom",currency:"GBP",rate:355,delivery:[["DHL Express · estimate",34],["UPS Worldwide · estimate",31]]},
  AE:{name:"United Arab Emirates",currency:"AED",rate:76,delivery:[["DHL Express · estimate",115],["UPS Worldwide · estimate",105]]},
  CA:{name:"Canada",currency:"CAD",rate:203,delivery:[["DHL Express · estimate",58],["UPS Worldwide · estimate",53]]},
  AU:{name:"Australia",currency:"AUD",rate:183,delivery:[["DHL Express · estimate",65],["UPS Worldwide · estimate",59]]}
};
const state={country:"PK",filter:"all",sort:"featured",cart:[],finish:"unstitched",deliveryIndex:0};
const $=(id)=>document.getElementById(id);
const money=(value)=>new Intl.NumberFormat("en",{style:"currency",currency:countries[state.country].currency,maximumFractionDigits:0}).format(value);
const productPrice=(product)=>product.price*(state.country==="PK"?1:2)/countries[state.country].rate;
function renderProducts(){
  const list=products.filter(p=>state.filter==="all"||p.type===state.filter);
  if(state.sort==="low")list.sort((a,b)=>productPrice(a)-productPrice(b));
  if(state.sort==="high")list.sort((a,b)=>productPrice(b)-productPrice(a));
  $("productGrid").innerHTML=list.map(p=>`<article class="product-card"><div class="product-art"><div class="product-photo" role="img" aria-label="${p.name} Pakistani fashion look" style="background-image:url('https://images.unsplash.com/${p.image}?auto=format&fit=crop&w=850&q=82')"></div><span class="product-tag">${p.tag}</span><button class="quick-add" data-add="${p.id}">QUICK ADD · ${money(productPrice(p))}</button></div><div class="product-details"><div><div class="product-title">${p.name}</div><div class="product-subtitle">${p.description}</div></div><div class="product-price">${money(productPrice(p))}<small>${state.country==="PK"?"UNSTITCHED":"INTERNATIONAL · 2× BASE"}</small></div></div></article>`).join("");
}
function renderDelivery(){
  const options=countries[state.country].delivery;
  state.deliveryIndex=Math.min(state.deliveryIndex,options.length-1);
  $("deliverySelect").innerHTML=options.map(([label,price],i)=>`<option value="${i}">${label} · ${money(price)}</option>`).join("");
  $("deliverySelect").value=String(state.deliveryIndex);
}
function renderCart(){
  $("bagCount").textContent=String(state.cart.reduce((n,x)=>n+x.quantity,0));
  $("cartTitleCount").textContent=`(${state.cart.reduce((n,x)=>n+x.quantity,0)})`;
  $("cartEmpty").classList.toggle("hidden",state.cart.length>0);
  $("cartSummary").classList.toggle("hidden",state.cart.length===0);
  $("cartLines").innerHTML=state.cart.map(item=>`<div class="cart-line"><img src="https://images.unsplash.com/${item.image}?auto=format&fit=crop&w=160&q=65" alt=""><div><strong>${item.name}</strong><small>${state.finish==="stitched"?"Custom stitching preview":"Unstitched"} · Qty ${item.quantity}</small><small>${money(productPrice(item)*item.quantity)}</small></div><button data-remove="${item.id}" aria-label="Remove ${item.name}">REMOVE</button></div>`).join("");
  if(!state.cart.length)return;
  renderDelivery();
  const international=state.country!=="PK";
  const productTotal=state.cart.reduce((sum,item)=>sum+productPrice(item)*item.quantity,0);
  const stitching=(state.finish==="stitched"?state.cart.reduce((sum,item)=>sum+item.price*0.35*item.quantity,0)*(international?2:1)/countries[state.country].rate:0);
  const delivery=Number(countries[state.country].delivery[state.deliveryIndex][1]);
  $("subtotalValue").textContent=money(productTotal);
  $("stitchingLabel").textContent=state.finish==="stitched"?"Stitching · estimate":"Stitching";
  $("stitchingValue").textContent=state.finish==="stitched"?money(stitching):"Not selected";
  $("deliveryLabel").textContent=countries[state.country].delivery[state.deliveryIndex][0];
  $("deliveryValue").textContent=money(delivery);
  $("totalValue").textContent=money(productTotal+stitching+delivery);
  $("currencyNote").textContent=international?"International clothing prices use 2× the Pakistan base and a fixed illustrative exchange rate. Confirm current FX, customs and courier charges before any real order.":"Pakistan preview rates in PKR. National courier charges are illustrative and must be confirmed before a real order.";
}
function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2400)}
function openCart(){ $("cartBackdrop").classList.remove("hidden");$("cartDrawer").classList.add("open");$("cartDrawer").setAttribute("aria-hidden","false");document.body.style.overflow="hidden" }
function closeCart(){ $("cartBackdrop").classList.add("hidden");$("cartDrawer").classList.remove("open");$("cartDrawer").setAttribute("aria-hidden","true");document.body.style.overflow="" }
function updateCountry(value){state.country=value;renderProducts();renderCart()}
document.querySelectorAll(".filter-tab").forEach(button=>button.addEventListener("click",()=>{document.querySelectorAll(".filter-tab").forEach(b=>b.classList.remove("active"));button.classList.add("active");state.filter=button.dataset.filter;renderProducts()}));
$("sortProducts").addEventListener("change",e=>{state.sort=e.target.value;renderProducts()});
$("countrySelect").addEventListener("change",e=>updateCountry(e.target.value));
$("productGrid").addEventListener("click",e=>{const button=e.target.closest("[data-add]");if(!button)return;const product=products.find(p=>p.id===button.dataset.add);const existing=state.cart.find(x=>x.id===product.id);existing?existing.quantity++:state.cart.push({...product,quantity:1});renderCart();toast(`${product.name} added to your preview bag.`)});
$("openCart").addEventListener("click",openCart);$("closeCart").addEventListener("click",closeCart);$("cartBackdrop").addEventListener("click",closeCart);
$("continueShopping").addEventListener("click",closeCart);
$("cartLines").addEventListener("click",e=>{const button=e.target.closest("[data-remove]");if(!button)return;state.cart=state.cart.filter(p=>p.id!==button.dataset.remove);renderCart()});
$("cartFinish").addEventListener("change",e=>{state.finish=e.target.value;renderCart()});
$("deliverySelect").addEventListener("change",e=>{state.deliveryIndex=Number(e.target.value);renderCart()});
$("checkoutButton").addEventListener("click",()=>toast("Demo checkout only — no order or payment was placed."));
$("menuToggle").addEventListener("click",()=>{const nav=$("mainNav");nav.classList.toggle("open");$("menuToggle").setAttribute("aria-expanded",String(nav.classList.contains("open")))});
document.querySelectorAll("#mainNav a").forEach(link=>link.addEventListener("click",()=> $("mainNav").classList.remove("open")));
const input=$("designImage");
input.addEventListener("change",()=>{
  const file=input.files&&input.files[0];if(!file)return;
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024){toast("Choose a JPG, PNG or WEBP image under 5 MB.");input.value="";return}
  const reader=new FileReader();reader.onload=()=>{$("designPreview").src=String(reader.result);$("designName").textContent=file.name;$("uploadPreview").classList.remove("hidden");$("uploadDrop").classList.add("hidden");$("uploadFeedback").textContent="Preview loaded locally. No image was uploaded to a server."};reader.onerror=()=>toast("This image could not be previewed.");reader.readAsDataURL(file);
});
$("removeUpload").addEventListener("click",()=>{input.value="";$("designPreview").removeAttribute("src");$("uploadPreview").classList.add("hidden");$("uploadDrop").classList.remove("hidden")});
$("uploadDrop").addEventListener("dragover",e=>{e.preventDefault();$("uploadDrop").style.background="#f2e9e1"});
$("uploadDrop").addEventListener("dragleave",()=>{$("uploadDrop").style.background=""});
$("uploadDrop").addEventListener("drop",e=>{e.preventDefault();$("uploadDrop").style.background="";const file=e.dataTransfer.files[0];if(!file)return;const transfer=new DataTransfer();transfer.items.add(file);input.files=transfer.files;input.dispatchEvent(new Event("change"))});
$("designForm").addEventListener("submit",e=>{e.preventDefault();if(!input.files.length){toast("Add a design image to preview your request.");return}toast("Preview request noted on this device only.");$("uploadFeedback").textContent="Sample request ready for a future real backend. Nothing was sent or saved beyond this browser session."});
renderProducts();renderCart();
