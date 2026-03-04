/* ═══════════════════════════════════════════════════════════
   OUYLA — script.js
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
    id: 'paired-hoodie',
    name: 'Жұп худи',
    desc: 'Екі худи. Сіздің өлшемдеріңіз бойынша бірдей баспа. Жұптарға арналған жиынтық.',
    badge: 'New drop',
    type: 'paired',
    image: 'img/hoodie-main.jpg',
    basePrice: 36000,
    extraColorPrice: 2000,
    includedColors: 2,
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { id: 'stone',   label: 'Stone',   hex: '#9E9E8F' },
      { id: 'chalk',   label: 'Chalk',   hex: '#E8E4DC' },
      { id: 'ash',     label: 'Ash',     hex: '#5A5A5A' },
      { id: 'onyx',    label: 'Onyx',    hex: '#1A1A1A' },
      { id: 'clay',    label: 'Clay',    hex: '#B87B60' },
      { id: 'dusk',    label: 'Dusk',    hex: '#4A5568' },
    ],
  },
  {
    id: 'single - hoodie',
    name: 'Жалғыз худи',
    desc: 'Өз өзін худи жасауға жалғыз худи.',
    badge: 'new drop',
    type: 'single',
    image: 'img/hoodie-main.jpg',
    basePrice: 36000,
    extraColorPrice: 2000,
    includedColors: 2,
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { id: 'stone',   label: 'Stone',   hex: '#9E9E8F' },
      { id: 'chalk',   label: 'Chalk',   hex: '#E8E4DC' },
      { id: 'ash',     label: 'Ash',     hex: '#5A5A5A' },
      { id: 'onyx',    label: 'Onyx',    hex: '#1A1A1A' },
      { id: 'clay',    label: 'Clay',    hex: '#B87B60' },
      { id: 'dusk',    label: 'Dusk',    hex: '#4A5568' },
    ],
  }
  /* ── Add more items by copying this block ──────────────────
  {
    id: 'oversized-tee',
    name: 'Oversized Tee',
    desc: 'Drop-shoulder cut. Brushed cotton. Wears like a second skin.',
    badge: 'New',
    type: 'single',
    image: 'img/tee-main.jpg',
    basePrice: 22,
    extraColorPrice: 0,
    includedColors: 1,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { id: 'chalk', label: 'Chalk', hex: '#E8E4DC' },
      { id: 'onyx',  label: 'Onyx',  hex: '#1A1A1A' },
    ],
  },
  ── ──────────────────────────────────────────────────────── */
];

/* ────────────────────────────────────────────────────────────
   BACKEND URL
   - Local / Docker:      leave as '/order'
   - After deploying backend to Render.com:
     change to 'https://your-app.onrender.com/order'
   ─────────────────────────────────────────────────────────── */
const ORDER_ENDPOINT = '185.98.7.92:8000/order';

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

/* ────────────────────────────────────────────────────────────
   CART STATE
   Each cart entry is independent — same product can appear
   multiple times with different options.
   ─────────────────────────────────────────────────────────── */
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

  /* Image */
  const imgHTML = `
    <div class="card-img">
      <img
        src="${item.image}"
        alt="${item.name}"
        loading="lazy"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
      />
      <div class="card-img-placeholder" style="display:none">
        <span>${item.image}</span>
        <span>Add your photo</span>
      </div>
      ${item.badge ? `<div class="card-img-badge">${item.badge}</div>` : ''}
    </div>`;

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

  card.innerHTML = `
    ${imgHTML}
    <div class="card-body">
      <div class="card-name">${item.name}</div>
      <div class="card-desc">${item.desc}</div>

      <div class="card-price" id="price-${item.id}">
        ₸${price}
        <span class="card-price-note">${isPaired ? 'жұп заттың құны' : 'әр зат құны'}</span>
      </div>

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
  subtotal.textContent  = `$${totalAmt}`;
  total.textContent     = `$${totalAmt}`;

  itemsEl.innerHTML = cart.map(entry => {
    const details = [
      entry.size1,
      entry.size2 ? `/ ${entry.size2}` : '',
      `— ${entry.colorNames}`,
    ].filter(Boolean).join(' ');

    return `
      <div class="cart-item">
        <div class="ci-left">
          <div class="ci-name">${entry.name}</div>
          <div class="ci-details">${details}</div>
        </div>
        <div class="ci-right">
          <div class="ci-price">$${entry.price * entry.qty}</div>
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
  document.getElementById('orderForm').style.display    = 'block';
  document.getElementById('orderSuccess').classList.remove('visible');
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
});

/* ────────────────────────────────────────────────────────────
   PLACE ORDER
   ─────────────────────────────────────────────────────────── */
async function submitOrder() {
  const name  = document.getElementById('fName').value.trim();
  const phone = document.getElementById('fPhone').value.trim();

  if (!name)  { showToast('Аты-жөніңізді енгізіңіз'); return; }
  if (!phone) { showToast('Телефон нөміріңізді енгізіңіз'); return; }
  if (cart.length === 0) { showToast('Сіз тауар тандамадыңыз'); return; }

  const btn = document.getElementById('placeOrderBtn');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  const payload = {
    name,
    phone,
    total: `$${cartTotal()}`,
    items: cart.map(e => ({
      name:   e.name,
      size1:  e.size1,
      size2:  e.size2 || null,
      colors: e.colorNames,
      price:  `$${e.price}`,
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
  btn.textContent = 'Place Order';

  document.getElementById('orderForm').style.display = 'none';
  document.getElementById('orderSuccess').classList.add('visible');

  cart = [];
  renderCart();
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
});
