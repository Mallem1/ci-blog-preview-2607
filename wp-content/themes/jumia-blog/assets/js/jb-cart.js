/**
 * Jumia Blog mini-cart.
 * Local cart (localStorage) fed by the shoppable blocks; checkout hands over to jumia.ci.
 * NOTE: direct cart injection on jumia.ci requires the shop's cart API / deep links —
 * until then the drawer links each item to its product page and the CTA opens jumia.ci/cart.
 */
(function () {
	var KEY = 'jb_cart_v1';

	function read() {
		try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
	}
	function write(items) {
		localStorage.setItem(KEY, JSON.stringify(items));
		renderBadge();
		renderDrawer();
	}
	function parsePrice(txt) {
		var m = (txt || '').replace(/\s| /g, '').match(/(\d[\d.,]*)/);
		return m ? parseInt(m[1].replace(/[.,]/g, ''), 10) : 0;
	}
	function fmt(n) {
		return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
	}

	function add(item) {
		var items = read();
		var found = items.find(function (i) { return i.url === item.url; });
		if (found) { found.qty += 1; } else { item.qty = 1; items.push(item); }
		write(items);
		openDrawer();
	}
	function removeAt(idx) {
		var items = read();
		items.splice(idx, 1);
		write(items);
	}

	/* ---------- header button + drawer ---------- */
	var drawer, overlay, badge;

	function buildUI() {
		var host = document.querySelector('.jb-header-cta');
		if (!host) { return; }
		var btn = document.createElement('button');
		btn.className = 'jb-cart-btn';
		btn.setAttribute('aria-label', 'Panier');
		btn.innerHTML = '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg><span class="jb-cart-badge" hidden>0</span>';
		btn.addEventListener('click', toggleDrawer);
		host.insertBefore(btn, host.firstChild);
		badge = btn.querySelector('.jb-cart-badge');

		overlay = document.createElement('div');
		overlay.className = 'jb-cart-overlay';
		overlay.addEventListener('click', closeDrawer);
		document.body.appendChild(overlay);

		drawer = document.createElement('aside');
		drawer.className = 'jb-cart-drawer';
		drawer.innerHTML = '<div class="jbc-head"><strong>Mon panier</strong><button class="jbc-close" aria-label="Fermer">✕</button></div>' +
			'<div class="jbc-items"></div>' +
			'<div class="jbc-foot"><div class="jbc-total"><span>Total</span><strong class="jbc-total-val">0 FCFA</strong></div>' +
			'<a class="jbc-checkout" href="https://www.jumia.ci/cart/" target="_blank" rel="noopener">Voir le panier Jumia →</a>' +
			'<p class="jbc-note">Étape 1 : « Ajouter sur Jumia » ouvre chaque fiche produit pour l\'ajouter au panier officiel. Étape 2 : finalisez sur jumia.ci.</p></div>';
		drawer.querySelector('.jbc-close').addEventListener('click', closeDrawer);
		document.body.appendChild(drawer);

		renderBadge();
		renderDrawer();
	}

	function renderBadge() {
		if (!badge) { return; }
		var count = read().reduce(function (s, i) { return s + i.qty; }, 0);
		badge.textContent = count;
		badge.hidden = count === 0;
	}

	function renderDrawer() {
		if (!drawer) { return; }
		var box = drawer.querySelector('.jbc-items');
		var items = read();
		if (!items.length) {
			box.innerHTML = '<p class="jbc-empty">Votre panier est vide.<br>Ajoutez des produits depuis les articles.</p>';
		} else {
			box.innerHTML = items.map(function (i, idx) {
				return '<div class="jbc-item">' +
					(i.img ? '<img src="' + i.img + '" alt="">' : '') +
					'<div class="jbc-item-info"><a href="' + i.url + '" target="_blank" rel="noopener">' + i.name + '</a>' +
					'<span>' + (i.qty > 1 ? i.qty + ' × ' : '') + fmt(i.price) + '</span></div>' +
					'<a class="jbc-item-go" href="' + i.url + '" target="_blank" rel="noopener">Ajouter sur Jumia ↗</a>' +
					'<button class="jbc-remove" data-idx="' + idx + '" aria-label="Retirer">✕</button></div>';
			}).join('');
			box.querySelectorAll('.jbc-remove').forEach(function (b) {
				b.addEventListener('click', function () { removeAt(parseInt(b.dataset.idx, 10)); });
			});
		}
		var total = items.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
		drawer.querySelector('.jbc-total-val').textContent = fmt(total);
	}

	function openDrawer() { drawer.classList.add('is-open'); overlay.classList.add('is-open'); }
	function closeDrawer() { drawer.classList.remove('is-open'); overlay.classList.remove('is-open'); }
	function toggleDrawer() { drawer.classList.contains('is-open') ? closeDrawer() : openDrawer(); }

	/* ---------- inject "add to cart" on shoppable blocks ---------- */
	function injectButtons() {
		// story product bars
		document.querySelectorAll('.jb-story-card .story-product').forEach(function (bar) {
			if (bar.parentNode.querySelector('.jbc-add-story')) { return; }
			var item = {
				name: (bar.querySelector('.sp-name') || {}).textContent || 'Produit',
				price: parsePrice((bar.querySelector('.sp-price') || {}).textContent),
				url: bar.href,
				img: (bar.querySelector('img') || {}).src || ''
			};
			var b = document.createElement('button');
			b.className = 'jbc-add-story';
			b.setAttribute('aria-label', 'Ajouter au panier');
			b.textContent = '+';
			b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); add(item); });
			var cta = bar.querySelector('.sp-cta');
			bar.insertBefore(b, cta);
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', function () { buildUI(); injectButtons(); });
	} else {
		buildUI(); injectButtons();
	}
})();
