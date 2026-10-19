// Sweet Gains — shared shell (header, footer, cart drawer) and page logic.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
  const FREE_SHIP = 999;
  const COUPONS = { GAINS10: 0.10, MITHAI15: 0.15 };
  const pad = (n) => String(n).padStart(2, '0');

  /* ---------- storage (fails soft in private mode) ---------- */
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  /* ---------- cart ---------- */
  let cart = store.get('sg-cart', []);
  const lineKey = (id, size) => id + '|' + size;
  const unitPrice = (p, size) => {
    const s = p.sizes.find((x) => x.label === size) || p.sizes[0];
    return Math.round(p.price * s.mult);
  };
  const Cart = {
    items: () => cart,
    count: () => cart.reduce((a, l) => a + l.qty, 0),
    subtotal: () => cart.reduce((a, l) => {
      const p = findProduct(l.id);
      return p ? a + unitPrice(p, l.size) * l.qty : a;
    }, 0),
    add(id, size, qty = 1) {
      const p = findProduct(id);
      size = size || p.sizes[0].label;
      const line = cart.find((l) => lineKey(l.id, l.size) === lineKey(id, size));
      line ? (line.qty += qty) : cart.push({ id, size, qty });
      this.save();
      toast(`<span class="label">Added</span><span>${p.name}, ${size}</span>`);
    },
    setQty(key, qty) {
      cart = cart.map((l) => (lineKey(l.id, l.size) === key ? { ...l, qty } : l)).filter((l) => l.qty > 0);
      this.save();
    },
    clear() { cart = []; this.save(); },
    save() { store.set('sg-cart', cart); renderCart(); },
  };

  /* ---------- shell ---------- */
  const page = document.body.dataset.page;
  const navKey = page === 'shop' ? new URLSearchParams(location.search).get('c') || 'shop' : page;
  const navLink = (href, label, key) =>
    `<a href="${href}" class="${navKey === key ? 'is-active' : ''}">${label}</a>`;

  const header = `
    <div class="announce label">
      <span>Free shipping over ₹999</span>
      <span>First order? Use GAINS10 at checkout</span>
      <span>Rolled weekly in Mumbai</span>
    </div>
    <header class="site-header">
      <div class="site-header__inner">
        <a href="index.html" class="brand" aria-label="Sweet Gains home"><img src="assets/img/logo.png" alt="Sweet Gains"></a>
        <nav class="site-nav" aria-label="Main">
          ${navLink('shop.html', 'Shop', 'shop')}
          ${navLink('shop.html?c=flavours', 'Flavours', 'flavours')}
          ${navLink('shop.html?c=bundles', 'Bundles', 'bundles')}
          ${navLink('index.html#story', 'Story', 'story')}
          ${navLink('index.html#faq', 'FAQ', 'faq')}
        </nav>
        <div class="site-header__actions">
          <a class="hide-sm" href="#">Account</a>
          <button class="nav-toggle" aria-label="Open menu">Menu</button>
          <button class="cart-btn" aria-label="Open cart">Cart <span class="cart-count">(0)</span></button>
        </div>
      </div>
    </header>
    <div class="mobile-nav" hidden>
      <button class="mobile-nav__close">Close ✕</button>
      <a href="shop.html">Shop</a><a href="shop.html?c=flavours">Flavours</a>
      <a href="shop.html?c=bundles">Bundles</a><a href="index.html#story">Story</a>
      <a href="index.html#faq">FAQ</a>
    </div>`;

  const footer = `
    <footer class="site-footer">
      <div class="footer-top">
        <div class="footer-news">
          <h4>Newsletter</h4>
          <p>New flavours and restocks, about twice a month.</p>
          <form class="newsletter" onsubmit="event.preventDefault(); this.outerHTML='<p class=&quot;newsletter__ok label&quot;>Subscribed. Your code is on its way.</p>'">
            <input type="email" required placeholder="Email address" aria-label="Email address">
            <button>Sign up</button>
          </form>
        </div>
        <div><h4>Shop</h4><a href="product.html?id=laddu-laal">Laddu Laal</a><a href="shop.html?c=flavours">Flavours</a><a href="product.html?id=gains-box">The Gains Box</a><a href="shop.html">Gift cards</a></div>
        <div><h4>Help</h4><a href="index.html#faq">FAQ</a><a href="#">Shipping</a><a href="#">Returns</a><a href="#">Contact</a></div>
        <div><h4>Social</h4><a href="#">Instagram</a><a href="#">YouTube</a><a href="#">LinkedIn</a></div>
      </div>
      <div class="footer-mark"><img src="assets/img/logo-cream.png" alt="Sweet Gains"></div>
      <div class="footer-base label">
        <span>© 2026 Sweet Gains Foods</span>
        <span>A college brand project</span>
        <span>Made with ghee in India</span>
      </div>
    </footer>
    <div class="drawer-scrim" hidden></div>
    <aside class="drawer" aria-label="Cart" aria-hidden="true">
      <div class="drawer__head"><h3>Cart <span class="drawer__count"></span></h3><button class="drawer__close">Close ✕</button></div>
      <div class="ship-meter"><p class="ship-meter__text"></p><div class="ship-meter__bar"><span></span></div></div>
      <div class="drawer__body"></div>
      <div class="drawer__foot">
        <div class="drawer__row"><span>Subtotal</span><b class="drawer__subtotal"></b></div>
        <p class="drawer__note label">Taxes included. Shipping at checkout.</p>
        <a href="checkout.html" class="btn btn--red btn--block">Checkout</a>
      </div>
    </aside>
    <div class="toast" role="status" aria-live="polite"></div>`;

  document.body.insertAdjacentHTML('afterbegin', header);
  document.body.insertAdjacentHTML('beforeend', footer);

  // drawer
  const drawer = $('.drawer'), scrim = $('.drawer-scrim');
  const openDrawer = () => { drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); scrim.hidden = false; document.body.classList.add('no-scroll'); };
  const closeDrawer = () => { drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); scrim.hidden = true; document.body.classList.remove('no-scroll'); };
  $('.cart-btn').addEventListener('click', openDrawer);
  $('.drawer__close').addEventListener('click', closeDrawer);
  scrim.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeDrawer());

  // mobile nav
  const mnav = $('.mobile-nav');
  $('.nav-toggle').addEventListener('click', () => (mnav.hidden = false));
  $('.mobile-nav__close').addEventListener('click', () => (mnav.hidden = true));
  $$('a', mnav).forEach((a) => a.addEventListener('click', () => (mnav.hidden = true)));

  function renderCart() {
    const n = Cart.count(), sub = Cart.subtotal();
    $('.cart-count').textContent = `(${n})`;
    $('.drawer__count').textContent = `(${n})`;
    $('.drawer__subtotal').textContent = inr(sub);
    const left = FREE_SHIP - sub;
    $('.ship-meter__text').textContent = left > 0
      ? `Add ${inr(left)} more for free shipping.`
      : 'Your order ships free.';
    $('.ship-meter__bar span').style.width = Math.min(100, (sub / FREE_SHIP) * 100) + '%';
    $('.drawer__foot').hidden = n === 0;

    const body = $('.drawer__body');
    if (!n) {
      body.innerHTML = `<div class="drawer__empty"><p>Nothing in<br>here yet.</p><a href="shop.html" class="btn">Shop laddus</a></div>`;
    } else {
      body.innerHTML = cart.map((l) => {
        const p = findProduct(l.id); if (!p) return '';
        const k = lineKey(l.id, l.size);
        return `<div class="line">
          <a href="product.html?id=${p.id}" class="line__img" style="--tint:${p.tint}"><img src="${p.image}" alt="${p.name}"></a>
          <div>
            <a href="product.html?id=${p.id}" class="line__name">${p.name}</a>
            <span class="line__meta label">${l.size}</span>
            <div class="qty qty--sm" data-key="${k}">
              <button data-d="-1" aria-label="Decrease">−</button><span>${l.qty}</span><button data-d="1" aria-label="Increase">+</button>
            </div>
          </div>
          <div class="line__price">${inr(unitPrice(p, l.size) * l.qty)}<button class="line__remove" data-key="${k}">Remove</button></div>
        </div>`;
      }).join('');
    }
    document.dispatchEvent(new CustomEvent('cart:change'));
  }
  $('.drawer__body').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.classList.contains('line__remove')) return Cart.setQty(b.dataset.key, 0);
    const wrap = b.closest('.qty'); if (!wrap) return;
    const line = cart.find((l) => lineKey(l.id, l.size) === wrap.dataset.key);
    Cart.setQty(wrap.dataset.key, line.qty + Number(b.dataset.d));
  });

  let toastTimer;
  function toast(html) {
    const t = $('.toast');
    t.innerHTML = `<div style="display:flex;gap:14px;align-items:baseline">${html}</div><button class="toast__view">View cart</button>`;
    t.classList.add('is-on');
    $('.toast__view', t).onclick = () => { t.classList.remove('is-on'); openDrawer(); };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-on'), 3000);
  }

  /* ---------- product cell ---------- */
  function cell(p, i) {
    const kind = p.imageIsCan ? 'is-can' : p.imageIsPhoto ? 'is-photo' : '';
    return `<article class="cell">
      <a href="product.html?id=${p.id}" class="cell__img ${kind}" style="--tint:${p.tint}">
        <span class="cell__no label">No. ${pad(i + 1)}</span>
        ${p.badge ? `<span class="cell__tag label">${p.badge}</span>` : ''}
        <img src="${p.image}" alt="${p.name}" loading="lazy">
      </a>
      <div class="cell__body">
        <div class="cell__row">
          <h3><a href="product.html?id=${p.id}">${p.name}</a></h3>
          <span class="price">${inr(p.price)}${p.compare ? `<s>${inr(p.compare)}</s>` : ''}</span>
        </div>
        <p class="cell__notes">${p.tagline}</p>
        <p class="label">${p.protein}g protein · ${p.kcal} kcal · ${p.sizes[0].label}</p>
        <button class="btn btn--line btn--block" data-add="${p.id}">Add to cart</button>
      </div>
    </article>`;
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-add]');
    if (b) { e.preventDefault(); Cart.add(b.dataset.add); }
  });

  const spec = (p, cls = '') => `<dl class="spec ${cls}">
    <div><dt>Protein</dt><dd>${p.protein}g</dd></div>
    <div><dt>Energy</dt><dd>${p.kcal}</dd></div>
    <div><dt>Sugar</dt><dd>${p.sugar}g</dd></div>
    <div><dt>Weight</dt><dd>50g</dd></div>
  </dl>`;

  /* ======================= pages ======================= */
  const pages = {
    home() {
      $('#bestsellers').innerHTML = PRODUCTS.filter((p) => p.category === 'flavours').map(cell).join('');
    },

    shop() {
      const params = new URLSearchParams(location.search);
      let filter = params.get('c') || 'all', sort = 'featured';
      const grid = $('#shop-grid'), count = $('.shop-count');
      const draw = () => {
        let list = PRODUCTS.filter((p) => filter === 'all' || p.category === filter);
        if (sort === 'low') list = [...list].sort((a, b) => a.price - b.price);
        if (sort === 'high') list = [...list].sort((a, b) => b.price - a.price);
        if (sort === 'rating') list = [...list].sort((a, b) => b.rating - a.rating);
        if (sort === 'protein') list = [...list].sort((a, b) => b.protein - a.protein);
        grid.innerHTML = list.map(cell).join('');
        count.textContent = `${pad(list.length)} items`;
        $$('.chips button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.c === filter));
      };
      $('.chips').addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        filter = b.dataset.c;
        history.replaceState(null, '', filter === 'all' ? 'shop.html' : `shop.html?c=${filter}`);
        draw();
      });
      $('#sort').addEventListener('change', (e) => { sort = e.target.value; draw(); });
      draw();
    },

    product() {
      const p = findProduct(new URLSearchParams(location.search).get('id')) || PRODUCTS[0];
      const idx = PRODUCTS.indexOf(p);
      document.title = `${p.name} | Sweet Gains`;
      let size = p.sizes[0].label, qty = 1;
      $('#pdp').innerHTML = `
        <nav class="crumbs label"><a href="index.html">Home</a><span>/</span><a href="shop.html">Shop</a><span>/</span><span>${p.name}</span></nav>
        <div class="pdp">
          <div class="pdp__gallery">
            <div class="pdp__main" style="--tint:${p.tint}"><img src="${p.gallery[0]}" alt="${p.name}"></div>
            <div class="pdp__thumbs">${p.gallery.slice(0, 5).map((g, i) => `<button aria-pressed="${i === 0}" aria-label="Image ${i + 1}" style="--tint:${p.tint}" data-src="${g}"><img src="${g}" alt=""></button>`).join('')}</div>
          </div>
          <div class="pdp__info">
            <div class="pdp__intro">
              <div class="pdp__meta label"><span>No. ${pad(idx + 1)}${p.badge ? ' · ' + p.badge : ''}</span><span>${p.rating}/5 · ${p.reviews.toLocaleString('en-IN')} reviews</span></div>
              <h1>${p.name}</h1>
              <p class="pdp__tag">${p.tagline}</p>
              <div class="pdp__price"><span class="price"></span><span class="pdp__per label"></span></div>
            </div>
            <p class="pdp__short">${p.short}</p>
            ${spec(p, 'spec--pdp')}
            <div class="pdp__buyarea">
              <span class="label">Size</span>
              <div class="sizes">${p.sizes.map((s, i) => `<button aria-pressed="${i === 0}" data-size="${s.label}">${s.label}<small>${inr(Math.round(p.price * s.mult))}</small></button>`).join('')}</div>
              <div class="pdp__buy">
                <div class="qty"><button data-d="-1" aria-label="Decrease">−</button><span class="qty__n">1</span><button data-d="1" aria-label="Increase">+</button></div>
                <button class="btn btn--red pdp__add">Add to cart</button>
              </div>
              <a href="checkout.html" class="btn btn--line btn--block pdp__buynow">Buy now</a>
            </div>
            <ul class="perks label">
              <li><span>Shipping</span><span>Free over ₹999, dispatched in 24 hrs</span></li>
              <li><span>Freshness</span><span>Rolled weekly, best within 45 days</span></li>
              <li><span>Returns</span><span>Full refund on your first can</span></li>
            </ul>
            <div class="acc">
              <details open><summary>Description</summary><div class="acc__body"><p>${p.description}</p></div></details>
              <details><summary>Nutrition</summary><div class="acc__body">
                <table class="nutri"><caption class="label">Per laddu, approx. 50g</caption>
                  <tr><td>Energy</td><td>${p.kcal} kcal</td></tr>
                  <tr><td>Protein</td><td>${p.protein} g</td></tr>
                  <tr><td>Carbohydrates</td><td>${Math.round((p.kcal - p.protein * 4 - 9 * 9) / 4)} g</td></tr>
                  <tr><td>Sugar (from jaggery)</td><td>${p.sugar} g</td></tr>
                  <tr><td>Fat</td><td>9 g</td></tr>
                  <tr><td>Fibre</td><td>4 g</td></tr>
                </table></div></details>
              <details><summary>Ingredients</summary><div class="acc__body"><p>${p.ingredients}</p><p>Contains milk, tree nuts and peanuts. Made in a kitchen that also handles gluten.</p></div></details>
            </div>
          </div>
        </div>`;

      const upd = () => {
        const u = unitPrice(p, size);
        $('.pdp__price .price').innerHTML = inr(u * qty) + (p.compare && size === p.sizes[0].label ? `<s>${inr(p.compare * qty)}</s>` : '');
        $('.pdp__per').textContent = qty > 1 ? `${inr(u)} each` : '';
        $('.qty__n').textContent = qty;
      };
      upd();
      $('.pdp__thumbs').addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        $('.pdp__main img').src = b.dataset.src;
        $$('.pdp__thumbs button').forEach((x) => x.setAttribute('aria-pressed', x === b));
      });
      $('.sizes').addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        size = b.dataset.size;
        $$('.sizes button').forEach((x) => x.setAttribute('aria-pressed', x === b));
        upd();
      });
      $('.pdp__buy .qty').addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        qty = Math.max(1, qty + Number(b.dataset.d)); upd();
      });
      $('.pdp__add').addEventListener('click', () => { Cart.add(p.id, size, qty); openDrawer(); });
      $('.pdp__buynow').addEventListener('click', () => Cart.add(p.id, size, qty));

      $('#related').innerHTML = PRODUCTS.filter((x) => x.id !== p.id).slice(0, 4).map((x) => cell(x, PRODUCTS.indexOf(x))).join('');
    },

    checkout() {
      let discount = 0, code = '';
      const sum = $('#summary');
      const draw = () => {
        const sub = Cart.subtotal();
        if (!Cart.count()) {
          $('.checkout').innerHTML = `<div class="empty-checkout"><span class="label">Checkout</span><h2>Your cart<br>is empty.</h2><p>Add a can or two first.</p><a class="btn" href="shop.html">Shop laddus</a></div>`;
          return;
        }
        const ship = sub >= FREE_SHIP ? 0 : 79;
        const off = Math.round(sub * discount);
        const total = sub - off + ship;
        sum.innerHTML = `
          <h3>Summary</h3>
          ${Cart.items().map((l) => {
            const p = findProduct(l.id); if (!p) return '';
            return `<div class="sum-line"><div class="line__img" style="--tint:${p.tint}"><img src="${p.image}" alt=""><span>×${l.qty}</span></div><div><b>${p.name}</b><small class="label">${l.size}</small></div><span>${inr(unitPrice(p, l.size) * l.qty)}</span></div>`;
          }).join('')}
          <form class="coupon"><input placeholder="Discount code" value="${code}" aria-label="Discount code"><button class="btn btn--plain">Apply</button></form>
          <p class="coupon__msg label">${code ? (discount ? `<span class="ok">${code} applied, ${discount * 100}% off</span>` : `<span class="err">Code not recognised</span>`) : 'Have a code? Try GAINS10'}</p>
          <div class="sum-row"><span>Subtotal</span><span>${inr(sub)}</span></div>
          ${off ? `<div class="sum-row ok"><span>Discount</span><span>−${inr(off)}</span></div>` : ''}
          <div class="sum-row"><span>Shipping</span><span>${ship ? inr(ship) : 'Free'}</span></div>
          <div class="sum-row sum-row--total"><span>Total</span><span>${inr(total)}</span></div>`;
        $('.coupon', sum).addEventListener('submit', (e) => {
          e.preventDefault();
          code = $('input', e.target).value.trim().toUpperCase();
          discount = COUPONS[code] || 0;
          draw();
        });
        $('#place').firstChild.textContent = `Place order, ${inr(total)}`;
      };
      document.addEventListener('cart:change', draw);
      draw();

      $$('.pay-opt input').forEach((r) => r.addEventListener('change', () => {
        $$('.pay-opt').forEach((o) => o.classList.toggle('is-on', $('input', o).checked));
      }));

      $('#checkout-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const f = e.target;
        if (!f.reportValidity()) return;
        const name = f.elements.fname.value.trim().replace(/[<>&"]/g, '');
        const order = 'SG-' + Math.floor(100000 + Math.random() * 900000);
        Cart.clear();
        $('.checkout').innerHTML = `<div class="confirm">
          <span class="label">Order ${order}</span>
          <h2>Thanks,<br>${name}.</h2>
          <p>We've got your order and the laddus are being rolled. Tracking details will be emailed once it ships.</p>
          <p class="label muted">Demo store for a college project. No payment was taken.</p>
          <a class="btn" href="index.html">Back to home</a>
        </div>`;
        scrollTo({ top: 0 });
      });
    },
  };

  renderCart();
  pages[page]?.();
})();
