/* ═══════════════════════════════════════════════════════════
   OYULA — script.js
   Catalog data, cart state, rendering, interactions
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ────────────────────────────────────────────────────────────
   CATALOG DATA
   To add a new product, add an object to this array.
   image: path relative to index.html, e.g. "img/hoodie-1.jpg"
   type:  "paired" (two size pickers) | "single" (one size picker)
   ─────────────────────────────────────────────────────────── */
const CATALOG = [
  
  {
    id: 'single - hoodie',
    name: 'Жалғыз худи',
    desc: 'Өз өзін худи жасауға жалғыз худи.',
    badge: 'New drop',
    type: 'single',
    images: [ 
      '../img/hoodie-single.jpg',
      '../img/hoodie-single2.png',
    ],
    notSalePrice: 23000,
    basePrice: 20000,
    extraColorPrice: 2000,
    includedColors: 2,
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { id: 'orange',   label: 'Қызыл-сары',   hex: '#FF7034' },
      { id: 'white',   label:  'Жұмсақ ақ',   hex: '#E8E4DC' },
      { id: 'coral',     label: 'Қызыл',     hex: '#f44839' },
      { id: 'green',    label: 'Жасыл',    hex: '#108010' },
      { id: 'pink',    label: 'Қызғылт',    hex: '#FF8DA1' },
      { id: 'lightblue',    label: 'Көгілдір',    hex: '#90D5FF' },
      { id: 'Lavender',    label: 'Лаванда',    hex: '#CB94F7' },
    ],
  },
  {
    id: 'paired-hoodie',
    name: 'Жұп худи',
    desc: 'Екі худи. Сіздің өлшемдеріңіз бойынша бірдей баспа. Жұптарға арналған жиынтық.',
    badge: 'New drop',
    type: 'paired',
    images: [ 
      '../img/hoodie-paired1.png',
      '../img/hoodie-paired2.png',
    ],
    notSalePrice: 42000,
    basePrice: 40000,
    extraColorPrice: 2000,
    includedColors: 2,
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { id: 'orange',   label: 'Қызыл-сары',   hex: '#FF7034' },
      { id: 'white',   label:  'Жұмсақ ақ',   hex: '#E8E4DC' },
      { id: 'coral',     label: 'Қызыл',     hex: '#f44839' },
      { id: 'green',    label: 'Жасыл',    hex: '#108010' },
      { id: 'pink',    label: 'Қызғылт',    hex: '#FF8DA1' },
      { id: 'lightblue',    label: 'Көгілдір',    hex: '#90D5FF' },
      { id: 'Lavender',    label: 'Лаванда',    hex: '#CB94F7' },
    ],
  },

];


/* ─── BACKEND URL ──────────────────────────────────────────────── */
const ORDER_ENDPOINT = 'https://ouyla.duckdns.org/order';

/* ────────────────────────────────────────────────────────────
   SELECTION STATE
   Tracks what the user has picked per product on the page
   ─────────────────────────────────────────────────────────── */
const selection = {};

function initSelection() {
  CATALOG.forEach(item => {
    selection[item.id] = {
      size1:  null,
      size2:  null,
      colors: [],    // array of selected color ids
    };
  });
}


let cart = [];   // [{ key, itemId, name, size1, size2, colors, price, qty }]

function cartKey(itemId, size1, size2, colors) {
  return `${itemId}|${size1}|${size2 || ''}|${[...colors].sort().join(',')}`;
}

function addToCart(itemId) {
  const item = CATALOG.find(i => i.id === itemId);
  const sel  = selection[itemId];

  if (!sel.size1) { showToast('Бірінші киім өлшемің таңдаңыз'); return; }
  if (item.type === 'paired' && !sel.size2) { showToast('Екініші киім өлшемің таңдаңыз '); return; }
  if (sel.colors.length === 0) { showToast('Кем дегенде бір бояуды таңдаңыз'); return; }

  const price = calcPrice(item, sel.colors.length);
  const key   = cartKey(itemId, sel.size1, sel.size2, sel.colors);
  const colorNames = item.colors
    .filter(c => sel.colors.includes(c.id))
    .map(c => c.label).join(', ');
  const thumb      = item.images && item.images[0] ? item.images[0] : null;
  const existing = cart.find(e => e.key === key);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({
      key,
      itemId,
      name:       item.name,
      size1:      sel.size1,
      size2:      sel.size2,
      colorIds:   [...sel.colors],
      colorNames,
      price,
      qty: 1,
      thumb 
    });
  }

  renderCart();
  openCart();
  showToast('Тапсырысқа қосылды');
}

function removeFromCart(key) {
  cart = cart.filter(e => e.key !== key);
  renderCart();
}

function changeQty(key, delta) {
  const entry = cart.find(e => e.key === key);
  if (!entry) return;
  entry.qty += delta;
  if (entry.qty <= 0) removeFromCart(key);
  else renderCart();
}

function calcPrice(item, colorCount) {
  const extra = Math.max(0, colorCount - item.includedColors);
  return item.basePrice + extra * item.extraColorPrice;
}

function cartTotal() {
  return cart.reduce((sum, e) => sum + e.price * e.qty, 0);
}

/* ────────────────────────────────────────────────────────────
   RENDER CATALOG
   ─────────────────────────────────────────────────────────── */
function renderCatalog() {
  const grid  = document.getElementById('catalogueGrid');
  const count = document.getElementById('catalogueCount');
  if (!grid) return;

  count.textContent = `${CATALOG.length} piece${CATALOG.length !== 1 ? 's' : ''}`;
  grid.innerHTML = '';

  CATALOG.forEach(item => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.id = `card-${item.id}`;
    grid.appendChild(card);
    refreshCard(item.id);
  });
}

function refreshCard(itemId) {
  const item = CATALOG.find(i => i.id === itemId);
  const sel  = selection[itemId];
  const card = document.getElementById(`card-${item.id}`);
  if (!card) return;

  const isPaired = item.type === 'paired';
  const price    = calcPrice(item, sel.colors.length);
  const imgs     = item.images && item.images.length ? item.images : ['../img/no-image.png'];
  const slideIdx = sel.slide || 0;

  /* ── Multi-image gallery ── */
  const slides = imgs.map((src, i) => `
    <div class="gallery-slide ${i == slideIdx ? 'active' : ''}" data-idx="${i}">
      <img src="${src}" alt="${item.name}"
           loading="lazy"
           onclick="openLightbox('${item.id}',${slideIdx})"  
           onerror="this.parentElement.classList.add('img-err')"
      />
    </div>`).join('');
    
  const dots = imgs.length > 1 ? imgs.map((_, i) =>
    `<div class="gallery-dot ${i === slideIdx ? 'active' : ''}" onclick="event.stopPropagation();goSlide('${item.id}',${i})"></div>`
  ).join('') : '';
  const arrows = imgs.length > 1 ? `
    <div class="gallery-nav">
      <button class="gallery-arrow" onclick="event.stopPropagation();lbSlideCard('${item.id}',-1)">&#8249;</button>
      <button class="gallery-arrow" onclick="event.stopPropagation();lbSlideCard('${item.id}',+1)">&#8250;</button>
    </div>` : '';

  const expandBtn = `
    <button class="gallery-expand" onclick="event.stopPropagation();openLightbox('${item.id}',${slideIdx})" title="Expand">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M1 4V1h3M8 1h3v3M11 8v3H8M4 11H1V8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
    </button>`;

  const badge = item.badge ? `<div class="card-img-badge">${item.badge}</div>` : '';

  /* Sizes */
  const sizeRow = (which) => item.sizes.map(sz => {
    const active = sel[which] === sz ? ' active' : '';
    return `<button class="size-btn${active}" onclick="selectSize('${item.id}','${which}','${sz}')">${sz}</button>`;
  }).join('');

  /* Colours */
  const colorRow = item.colors.map(c => {
    const active = sel.colors.includes(c.id) ? ' active' : '';
    return `
      <div class="color-swatch${active}" onclick="toggleColor('${item.id}','${c.id}')" title="${c.label}">
        <div class="swatch-blob" style="background:${c.hex}"></div>
        <span class="swatch-name">${c.label}</span>
      </div>`;
  }).join('');

  const extraNote = item.extraColorPrice > 0 ? `
    <p class="pricing-note">
      <strong>${item.includedColors} бояу негізгі болып табылады</strong>.
      Тағы әр бояу <strong>+₸${item.extraColorPrice}</strong>.
    </p>` : '';
  const extraPriceInfo = item.notSalePrice != undefined? `
  <div class="card-notSalePrice" id="price-${item.notSalePrice}">
        ₸${item.notSalePrice + price - item.basePrice}
      </div>
  ` : '';
  /**/
  card.innerHTML = `
   <div class="card-gallery">
      <div class="gallery-slides">${slides}</div>
      ${badge}${expandBtn}${arrows}
      <div class="gallery-dots">${dots}</div>
    </div>
    <div class="card-body">
      <div class="card-name">${item.name}</div>
      <div class="card-desc">${item.desc}</div>
      
      <div class="card-price" id="price-${item.id}">
        ₸${price}
      <span class="card-price-note">${isPaired ?  'жұп худидың құны':'жалпы құны' }</span>
      </div>
      ${extraPriceInfo}
      <div class="card-section">Бірінші өлшем</div>
      <div class="size-row">${sizeRow('size1')}</div>

      ${isPaired ? `
        <div class="card-section">Екінші өлшем</div>
        <div class="size-row">${sizeRow('size2')}</div>
      ` : ''}

      <div class="card-section">Бояулар${isPaired ? 's' : ''}</div>
      
      <div class="color-row">${colorRow}</div>
      ${extraNote}

      <button class="add-btn" onclick="addToCart('${item.id}')">
        Тапсырысқа қосу
      </button>
    </div>`;
}

function goSlide(itemId, idx) {
  const item = CATALOG.find(i => i.id === itemId);
  const imgs = item.images || [];
  selection[itemId].slide = (idx + imgs.length) % imgs.length;
  refreshCard(itemId);
}
function lbSlideCard(itemId, dir) {
  const item = CATALOG.find(i => i.id === itemId);
  const imgs = item.images || [];
  const cur  = selection[itemId].slide || 0;
  goSlide(itemId, cur + dir);
}
function selectSize(itemId, which, size) {
  selection[itemId][which] = size;
  refreshCard(itemId);
}

function toggleColor(itemId, colorId) {
  const sel = selection[itemId];
  const idx = sel.colors.indexOf(colorId);
  idx > -1 ? sel.colors.splice(idx, 1) : sel.colors.push(colorId);
  refreshCard(itemId);
    /* Animate price */
  const priceEl = document.getElementById(`price-${itemId}`);
  if (priceEl) {
    priceEl.style.transition = 'none';
    priceEl.style.opacity = '0.4';
    requestAnimationFrame(() => {
      priceEl.style.transition = 'opacity 0.3s';
      priceEl.style.opacity = '1';
    });
  }
}
/* ─── LIGHTBOX ─────────────────────────────────────────────────── */
let lbImages = [];
let lbIndex  = 0;

function openLightbox(itemId, startIdx) {
  const item = CATALOG.find(i => i.id === itemId);
  lbImages = item.images && item.images.length ? item.images : ['../img/no-image.png'];
  lbIndex  = startIdx || 0;
  renderLightbox();
  document.getElementById('lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
}

function lbStep(dir) {
  lbIndex = (lbIndex + dir + lbImages.length) % lbImages.length;
  renderLightbox();
}

function renderLightbox() {
  const img  = document.getElementById('lightboxImg');
  const dots = document.getElementById('lightboxDots');
  const prev = document.getElementById('lbPrev');
  const next = document.getElementById('lbNext');
  if (img)  img.src = lbImages[lbIndex];
  if (prev) prev.style.display = lbImages.length > 1 ? '' : 'none';
  if (next) next.style.display = lbImages.length > 1 ? '' : 'none';
  if (dots) dots.innerHTML = lbImages.map((_, i) =>
    `<div class="lb-dot ${i === lbIndex ? 'active' : ''}" onclick="lbIndex=${i};renderLightbox()"></div>`
  ).join('');
}




/* ────────────────────────────────────────────────────────────
   RENDER CART
   ─────────────────────────────────────────────────────────── */
function renderCart() {
  const itemsEl   = document.getElementById('cartItems');
  const emptyEl   = document.getElementById('cartEmpty');
  const footerEl  = document.getElementById('cartFooter');
  const subtotal  = document.getElementById('cartSubtotal');
  const total     = document.getElementById('cartTotal');
  const countEl   = document.getElementById('cartCount');
  if (!itemsEl) return;
  const totalQty  = cart.reduce((s, e) => s + e.qty, 0);
  const totalAmt  = cartTotal();

  countEl.textContent = totalQty;

  if (cart.length === 0) {
    emptyEl.style.display  = 'flex';
    itemsEl.innerHTML      = '';
    footerEl.classList.remove('visible');
    return;
  }

  emptyEl.style.display = 'none';
  footerEl.classList.add('visible');
  subtotal.textContent  = `₸${totalAmt}`;
  total.textContent     = `₸${totalAmt}`;

  itemsEl.innerHTML = cart.map(entry => {
    const details = [
      entry.size1,
      entry.size2 ? `/ ${entry.size2}` : '',
      `— ${entry.colorNames}`,
    ].filter(Boolean).join(' ');
    const thumbHTML = entry.thumb
      ? `<img class="ci-thumb" src="${entry.thumb}" alt="${entry.name}"
             onerror="this.style.display='none';this.nextElementSibling.style.display='block'"/>
         <div class="ci-thumb-placeholder" style="display:none"></div>`
      : `<div class="ci-thumb-placeholder"></div>`;
    return `
      <div class="cart-item">
          <div class="ci-left-thumb">
            ${thumbHTML}
            <div class="ci-left">
              <div class="ci-name">${entry.name}</div>
              <div class="ci-details">${details}</div>
            </div>
          </div>
        
          <div class="ci-right">
            <div class="ci-price">₸${entry.price * entry.qty}</div>
            <div class="ci-controls">
              <button class="qty-btn" onclick="changeQty('${entry.key}', -1)">−</button>
              <span class="qty-val">${entry.qty}</span>
              <button class="qty-btn" onclick="changeQty('${entry.key}', +1)">+</button>
            </div>
            <button class="ci-remove" onclick="removeFromCart('${entry.key}')">Өшіру</button>
          </div>
        
      </div>`;
  }).join('');

  /* Reset form / success visibility when cart updates */

}

/* ────────────────────────────────────────────────────────────
   CART OPEN / CLOSE
   ─────────────────────────────────────────────────────────── */
function openCart() {
  document.getElementById('cartOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cartOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('cartTrigger').addEventListener('click', openCart);
  document.getElementById('cartClose').addEventListener('click', closeCart);
  document.getElementById('cartOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('cartOverlay')) closeCart();
  });
  document.getElementById('browseLink')?.addEventListener('click', closeCart);
  document.getElementById('placeOrderBtn').addEventListener('click', submitOrder);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCart(); });

  /* ── Confirm popup wiring ── */
  document.getElementById('confirmOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('confirmOverlay')) closeConfirm();
  });

  /* ── Success popup wiring ── */
  document.getElementById('successOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('successOverlay')) closeSuccess();
  });
});

/* ────────────────────────────────────────────────────────────
   CONFIRM POPUP
   ─────────────────────────────────────────────────────────── */
function openConfirm() {
  const phone = document.getElementById('fPhone').value.trim();
  document.getElementById('confirmPhone').textContent = phone;
  document.getElementById('confirmOverlay').classList.add('open');
}

function closeConfirm() {
  document.getElementById('confirmOverlay').classList.remove('open');
}

/* ────────────────────────────────────────────────────────────
   SUCCESS POPUP
   ─────────────────────────────────────────────────────────── */
function openSuccess() {
  document.getElementById('successOverlay').classList.add('open');
}

function closeSuccess() {
  document.getElementById('successOverlay').classList.remove('open');
  closeCart();
}

/* ────────────────────────────────────────────────────────────
   PLACE ORDER
   submitOrder    → validates → opens confirm popup
   confirmAndSend → user approved → sends → opens success popup
   ─────────────────────────────────────────────────────────── */
async function submitOrder() {
  const name  = document.getElementById('fName').value.trim();
  const phone = document.getElementById('fPhone').value.trim();

  if (!name)  { showToast('Аты-жөніңізді енгізіңіз'); return; }
  if (!phone) { showToast('Телефон нөміріңізді енгізіңіз'); return; }
  if (cart.length === 0) { showToast('Сіз тауар тандамадыңыз'); return; }

  openConfirm();
}

async function confirmAndSend() {
  closeConfirm();

  const name  = document.getElementById('fName').value.trim();
  const phone = document.getElementById('fPhone').value.trim();

  const btn = document.getElementById('placeOrderBtn');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  const payload = {
    name,
    phone,
    total: `₸${cartTotal()}`,
    items: cart.map(e => ({
      name:   e.name,
      size1:  e.size1,
      size2:  e.size2 || null,
      colors: e.colorNames,
      price:  `₸${e.price}`,
      qty:    e.qty,
    })),
  };

  try {
    await fetch(ORDER_ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
  } catch (_) {
    /* Static/offline fallback — still shows success */
    console.log("problems")
  }

  btn.disabled    = false;
  btn.textContent = 'Тапсырыс орнату';

  cart = [];
  renderCart();
  openSuccess();
}

/* ────────────────────────────────────────────────────────────
   TOAST
   ─────────────────────────────────────────────────────────── */
let toastTimer;
function showToast(msg) {
  let el = document.getElementById('ouyla-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'ouyla-toast';
    el.style.cssText = `
      position:fixed; bottom:2rem; left:50%;
      transform:translateX(-50%) translateY(80px);
      background:var(--text-main); color:var(--bg);
      font-family:var(--sans); font-size:0.65rem; font-weight:500;
      letter-spacing:0.18em; text-transform:uppercase;
      padding:0.65rem 1.6rem;
      z-index:9999;
      transition:transform 0.4s cubic-bezier(0.34,1.3,0.64,1);
      pointer-events:none; white-space:nowrap;
    `;
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.style.transform = 'translateX(-50%) translateY(80px)';
  }, 2600);
}

/* ────────────────────────────────────────────────────────────
   CUSTOM CURSOR
   ─────────────────────────────────────────────────────────── */
function initCursor() {
  const ring = document.getElementById('cursor');
  const dot  = document.getElementById('cursor-dot');
  if (!ring || !dot) return;

  let mx = -100, my = -100;
  let rx = -100, ry = -100;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
  });

  (function animateRing() {
    rx += (mx - rx) * 0.14;
    ry += (my - ry) * 0.14;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(animateRing);
  })();
}

/* ────────────────────────────────────────────────────────────
   SCROLL REVEAL
   Simple intersection-observer fade-up for cards
   ─────────────────────────────────────────────────────────── */
function initReveal() {
  const style = document.createElement('style');
  style.textContent = `
    .reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.7s cubic-bezier(0.4,0,0.2,1), transform 0.7s cubic-bezier(0.4,0,0.2,1); }
    .reveal.visible { opacity: 1; transform: none; }
  `;
  document.head.appendChild(style);

  const targets = document.querySelectorAll('.product-card, .editorial-inner, .catalogue-header');
  targets.forEach(el => el.classList.add('reveal'));

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  targets.forEach(el => io.observe(el));
}

function initFooterAndEdi(){
  document.getElementById("site-footer").innerHTML = '<div class="footer-inner"> <div class="footer-top"> <div class="footer-wordmark">oyula</div><div class="footer-tagline">Spring 2026 drop collection</div></div><div class="footer-rule"></div><div class="footer-bottom"><span>All orders fulfilled personally.</span><span>oyula 2026</span><span> <a href="privacy.html" target="_blank">Құпиялылық саясаты</a> </span></div></div>';
  document.getElementById("howToUse1").innerHTML = '1)	Бояуды жағу: Жұмысты бастамас бұрын бояуды жақсылап араластырып алыңыз. Бояуды қылқаламмен жұқа әрі тегіс қабат етіп жағыңыз.';
  document.getElementById("howToUse2").innerHTML ='2)	Кептіру және бекіту: Дайын суретті 24 сағат бойы кептіріңіз. Содан кейін мақта мата арқылы бусыз үтікпен 10 минут бойы үтіктеңіз (мақта матаға арналған температурада). Үтіктеу барысында суретке «демалуға» мүмкіндік беріп, арасында үзіліс жасап тұрыңыз.';
  document.getElementById("howToUse3").innerHTML ='3)	Күтім көрсету: Үтіктегеннен кейін 48 сағат өткен соң бұйымды жууға болады. Жұмсақ жуғыш заттарды қолданып, 30°C-тан 40°C-қа дейінгі температурада, қатты механикалық күш салмай (нәзік жуу режимінде) жуыңыз.';
}
/* ────────────────────────────────────────────────────────────
   HEADER SCROLL BEHAVIOUR
   ─────────────────────────────────────────────────────────── */
function initHeader() {
  const header = document.getElementById('site-header');
  if (!header) return;
  let lastY = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > 80 && y > lastY) {
      header.style.transform = 'translateY(-100%)';
      header.style.transition = 'transform 0.4s cubic-bezier(0.4,0,0.2,1)';
    } else {
      header.style.transform = 'translateY(0)';
    }
    lastY = y;
  }, { passive: true });
}

/* ────────────────────────────────────────────────────────────
   INIT
   ─────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initSelection();
  renderCatalog();
  renderCart();
  initCursor();
  initReveal();
  initHeader();
  initFooterAndEdi();
  // Cookie banner
const cookieBar    = document.getElementById('cookieBar');
const cookieAccept = document.getElementById('cookieAccept');

if (!localStorage.getItem('ouyla_cookies_accepted')) {
  setTimeout(() => cookieBar.classList.add('visible'), 1200);
}

cookieAccept.addEventListener('click', () => {
  localStorage.setItem('ouyla_cookies_accepted', '1');
  cookieBar.classList.remove('visible');
});
});