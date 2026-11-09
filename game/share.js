// "Share as PNG": draws a deck sheet (header, every card in cost order, mana curve, import code) on a canvas.
// Public API: RJShare.render({name, ids, icon, stats:{n,u,sp,avg,cv}, code}) -> Promise<Blob (image/png)>
// The card faces are drawn the same way style.css lays out .card (art on top, frame overlay, name / subtype / cost / ATK / HP / text),
// so the image looks like the cards in the game. Card art is read from img/, except when the game is opened from disk (file://),
// where browsers refuse to export a canvas that used local files - there the art comes from deck-art.js (data URIs, loaded on demand).
(function () {
  const CW = 260, CH = 368, GAP = 22, COLS = 6, PAD = 64, HEAD = 250, FOOT = 340;
  const RED = '#c4161c', BG = '#050505', LN = '#2a2a2a';
  let artP = null;
  const ensureArt = () => {
    if (location.protocol !== 'file:' || window.RJ_ART) return Promise.resolve();
    return artP || (artP = new Promise(res => { const s = document.createElement('script'); s.src = 'deck-art.js'; s.onload = s.onerror = () => res(); document.head.appendChild(s); }));
  };
  const cache = {};
  const loadImg = src => cache[src] || (cache[src] = new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }));
  const artOf = id => loadImg((window.RJ_ART && window.RJ_ART[id]) || artSrc(id)).then(i => i || loadImg((window.RJ_ART && window.RJ_ART.missing) || 'img/missing_texture.webp'));
  const frameImg = () => loadImg((window.RJ_ART && window.RJ_ART.frame) || 'img/CardFront.png');

  // ---- text with the game's keyword highlighting (same words as hl() in ui.js) ----
  function chunksOf(desc) {
    const html = hl(desc || ''), runs = [], re = /<span class="k( u)?">(.*?)<\/span>/g; let last = 0, m;
    while ((m = re.exec(html))) { if (m.index > last) runs.push([html.slice(last, m.index), 0]); runs.push([m[2], m[1] ? 2 : 1]); last = re.lastIndex; }
    if (last < html.length) runs.push([html.slice(last), 0]);
    const out = []; let cur = [];
    const flush = () => { if (cur.length) out.push(cur); cur = []; };
    runs.forEach(([t, k]) => t.split(/(\s+)/).forEach(p => {
      if (!p) return;
      if (/^\s+$/.test(p)) { if (p.includes('\n')) { flush(); out.push('br'); } else flush(); }
      else cur.push([p, k]);
    }));
    flush(); return out;
  }

  function drawCard(ctx, d, x, y, art, frame, F) {
    const ix = x + 3, iy = y + 3, iw = CW - 6, ih = CH - 6, cq = iw / 100, unit = d.Type == 'Unit';
    ctx.fillStyle = LN; ctx.fillRect(x - 2, y - 2, CW + 4, CH + 4);
    ctx.fillStyle = '#000'; ctx.fillRect(x, y, CW, CH);
    // art: object-fit cover, aligned to the top, top 75% of the card
    ctx.save(); ctx.beginPath(); ctx.rect(ix, iy, iw, ih * .75); ctx.clip(); ctx.fillStyle = '#fff'; ctx.fillRect(ix, iy, iw, ih * .75);
    if (art) { const s = Math.max(iw / art.width, ih * .75 / art.height), w = art.width * s, h = art.height * s; ctx.drawImage(art, ix + (iw - w) / 2, iy, w, h); }
    ctx.restore();
    if (frame) ctx.drawImage(frame, ix, iy, iw, ih);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.textBaseline = 'middle';
    // name
    const nm = d.Name, nf = nm.length > 18 ? .62 : nm.length > 14 ? .75 : nm.length > 11 ? .88 : 1, nfs = 6.6 * cq * nf * F.fw;
    ctx.font = `700 ${nfs}px ${F.fd}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'right';
    if ('letterSpacing' in ctx) ctx.letterSpacing = (.3 * cq) + 'px';
    ctx.fillText(nm.toUpperCase(), ix + 61 * cq, iy + 3.4 * cq + nfs * .6);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    // subtype
    const sfs = 4.6 * cq; ctx.font = `400 ${sfs}px ${F.fb}`; ctx.fillStyle = '#bbb'; ctx.textAlign = 'left';
    ctx.fillText('- ' + (unit ? (d.Subtypes || []).join(' ') : 'Action') + ' -', ix + 8 * cq, iy + 12.8 * cq + sfs * .6);
    // cost (roman numeral)
    const cfs = 12.5 * cq; ctx.font = `700 ${cfs}px ${F.fd}`; ctx.fillStyle = RED; ctx.textAlign = 'right';
    ctx.fillText(ROM(d.Cost), ix + iw - 3 * cq, iy + .5 * cq + cfs * .575);
    // ATK / HP boxes
    if (unit) [[d.Attack || 0, .14], [d.Health || 0, .29]].forEach(([v, ty]) => {
      const bw = 15 * cq, bx = ix + iw - 2.2 * cq - bw, by = iy + ih * ty;
      ctx.fillStyle = '#000'; ctx.fillRect(bx, by, bw, bw); ctx.fillStyle = '#fff'; ctx.fillRect(bx + .9 * cq, by + .9 * cq, bw - 1.8 * cq, bw - 1.8 * cq);
      ctx.font = `700 ${10.5 * cq}px ${F.fd}`; ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.fillText(String(v), bx + bw / 2, by + .9 * cq + 6.7 * cq);
    });
    // keywords + description, centred in the bottom 25% (shrinks a little if a text is long)
    const areaTop = iy + ih * .75 + 3 * cq, areaH = ih * .25 - 4.2 * cq, maxW = iw - 10 * cq;
    const kws = (d.Keywords || []).filter(k => k != 'BurnSource').map(k => [kwLabel(d, k), BAD.has(k)]);
    const chunks = chunksOf(d.Description);
    let fs = 6.3 * cq, lines, kfs, total;
    for (;;) {
      kfs = fs * 1.16; const lh = fs * 1.16;
      ctx.font = `400 ${fs}px ${F.fb}`;
      const sp = ctx.measureText(' ').width, wOf = c => c.reduce((a, [t]) => a + ctx.measureText(t).width, 0);
      lines = []; let line = [], lw = 0;
      chunks.forEach(c => {
        if (c === 'br') { lines.push(line); line = []; lw = 0; return; }
        const w = wOf(c);
        if (line.length && lw + sp + w > maxW) { lines.push(line); line = []; lw = 0; }
        lw += (line.length ? sp : 0) + w; line.push(c);
      });
      if (line.length) lines.push(line);
      total = lines.length * lh + (kws.length ? kfs * 1.0 : 0);
      if (total <= areaH || fs <= 3.8 * cq) break;
      fs -= .25 * cq / 2;
    }
    const lh = fs * 1.16; let ty = areaTop + (areaH - total) / 2;
    ctx.textAlign = 'left';
    if (kws.length) {
      ctx.font = `700 ${fs * 6.4 / 6.3}px ${F.fb}`;
      const sp = ctx.measureText(' ').width, tw = kws.reduce((a, [t], i) => a + ctx.measureText(t).width + (i ? sp : 0), 0);
      let px = ix + (iw - tw) / 2;
      kws.forEach(([t, bad]) => { ctx.fillStyle = bad ? '#e3242b' : '#f2f2f2'; ctx.fillText(t, px, ty + kfs / 2); px += ctx.measureText(t).width + sp; });
      ty += kfs;
    }
    ctx.font = `400 ${fs}px ${F.fb}`;
    const sp = ctx.measureText(' ').width;
    lines.forEach(ln => {
      const widths = ln.map(c => c.reduce((a, [t]) => a + ctx.measureText(t).width, 0)), tw = widths.reduce((a, b) => a + b, 0) + sp * Math.max(0, ln.length - 1);
      let px = ix + (iw - tw) / 2;
      ln.forEach((c, ci) => {
        c.forEach(([t, k]) => {
          const w = ctx.measureText(t).width; ctx.fillStyle = k ? '#e3242b' : '#f2f2f2'; ctx.fillText(t, px, ty + lh / 2);
          if (k == 2) ctx.fillRect(px, ty + lh / 2 + fs * .42, w, Math.max(1, fs * .06));
          px += w;
        });
        px += sp;
      });
      ty += lh;
    });
  }

  // compact sheet (deck preview): just the cards, columns chosen so the whole grid fits a box of the given width:height
  const bestCols = (n, aspect) => { let best = 1, bs = 0; for (let c = 1; c <= Math.max(1, n); c++) { const r = Math.ceil(n / c), w = 28 + c * CW + (c - 1) * 10, h = 28 + r * CH + (r - 1) * 10, s = Math.min(aspect / w, 1 / h); if (s > bs) { bs = s; best = c; } } return best; };

  async function render(o) {
    await ensureArt();
    const css = getComputedStyle(document.body);
    const F = { fd: css.getPropertyValue('--fd').trim() || 'monospace', fb: css.getPropertyValue('--fb').trim() || 'monospace', fw: parseFloat(css.getPropertyValue('--fw')) || 1 };
    try { await Promise.all([document.fonts.load('700 30px ' + F.fd), document.fonts.load('400 30px ' + F.fb), document.fonts.load('700 30px ' + F.fb)]); } catch (e) {}
    const ids = o.ids.filter(id => CD[id]).sort((a, b) => CD[a].Cost - CD[b].Cost || CD[a].Name.localeCompare(CD[b].Name) || a - b);
    const cp = !!o.compact, cols = cp ? bestCols(ids.length, o.aspect || 1.9) : COLS, pad = cp ? 14 : PAD, head = cp ? 14 : HEAD, foot = cp ? 14 : FOOT, gap = cp ? 10 : GAP;
    const rows = Math.max(1, Math.ceil(ids.length / cols));
    const W = pad * 2 + cols * CW + (cols - 1) * gap, gridH = rows * CH + (rows - 1) * gap, H = head + gridH + foot;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
    const uniq = [...new Set(ids)];
    const [frame, iconArt, ...arts] = await Promise.all([frameImg(), o.icon ? artOf(o.icon) : null, ...uniq.map(artOf)]);
    const artById = {}; uniq.forEach((id, i) => artById[id] = arts[i]);

    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    // cards
    ids.forEach((id, i) => {
      const x = pad + (i % cols) * (CW + gap), y = head + Math.floor(i / cols) * (CH + gap);
      drawCard(ctx, CD[id], x, y, artById[id], frame, F);
      const q = cp && o.counts ? o.counts[id] : 0;
      if (q > 1) {
        ctx.fillStyle = RED; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x + 10, y + 10, 84, 48, 12); else ctx.rect(x + 10, y + 10, 84, 48); ctx.fill();
        ctx.font = `700 34px ${F.fd}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('x' + q, x + 52, y + 35);
      }
    });
    if (!cp) {
    // header: icon-card badge + name + stats
    const bs = 168, bx = PAD, by = 44;
    ctx.save(); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, bs, bs, 22) : ctx.rect(bx, by, bs, bs); ctx.clip();
    ctx.fillStyle = '#000'; ctx.fillRect(bx, by, bs, bs);
    if (iconArt) { const s = Math.max(bs / iconArt.width, bs / iconArt.height), w = iconArt.width * s, h = iconArt.height * s; ctx.drawImage(iconArt, bx + (bs - w) / 2, by + (bs - h) * .18, w, h); }
    ctx.restore();
    ctx.lineWidth = 8; ctx.strokeStyle = RED; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx + 4, by + 4, bs - 8, bs - 8, 20) : ctx.rect(bx + 4, by + 4, bs - 8, bs - 8); ctx.stroke();
    const tx = bx + bs + 40, tw = W - PAD - tx; let nfs = 92;
    const name = (o.name || 'Deck').trim() || 'Deck';
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    for (; nfs > 40; nfs -= 2) { ctx.font = `700 ${nfs}px ${F.fd}`; if (ctx.measureText(name).width <= tw) break; }
    ctx.fillStyle = '#fff'; ctx.fillText(name, tx, by + 92);
    const st = o.stats || {};
    ctx.font = `400 36px ${F.fb}`; ctx.fillStyle = '#8d8d8d';
    ctx.fillText(`${st.n || ids.length} cards  \u00b7  ${st.u || 0} units  \u00b7  ${st.sp || 0} spells  \u00b7  avg cost ${(st.avg || 0).toFixed(1)}`, tx + 2, by + 150);
    ctx.fillStyle = LN; ctx.fillRect(PAD, HEAD - 28, W - PAD * 2, 3);

    // footer: mana curve (left), import code + brand (right)
    const fy = HEAD + gridH + 30; ctx.fillStyle = LN; ctx.fillRect(PAD, fy, W - PAD * 2, 3);
    const cvv = st.cv || Array(8).fill(0), mx = Math.max(1, ...cvv), bw = 64, bg = 16, base = fy + 238, bh = 120;
    ctx.font = `700 22px ${F.fd}`; ctx.fillStyle = '#777'; ctx.textAlign = 'left'; ctx.fillText('MANA CURVE', PAD, fy + 56);
    cvv.forEach((q, i) => {
      const x = PAD + i * (bw + bg), h = q ? Math.max(14, q / mx * bh) : 4;
      ctx.fillStyle = q ? RED : '#333'; ctx.fillRect(x, base - h, bw, h);
      ctx.textAlign = 'center'; ctx.font = `700 26px ${F.fd}`; ctx.fillStyle = '#ddd'; if (q) ctx.fillText(String(q), x + bw / 2, base - h - 10);
      ctx.font = `400 24px ${F.fb}`; ctx.fillStyle = '#888'; ctx.fillText(i == 7 ? '7+' : String(i), x + bw / 2, base + 36);
    });
    const rx = PAD + 8 * (bw + bg) + 70; ctx.textAlign = 'left';
    if (o.code) {
      ctx.font = `700 22px ${F.fd}`; ctx.fillStyle = '#777'; ctx.fillText('IMPORT CODE  (Card Collection \u203a Decks \u203a Import code)', rx, fy + 56);
      ctx.font = '400 29px "Courier New", monospace'; ctx.fillStyle = '#ddd';
      const per = Math.max(20, Math.floor((W - PAD - rx) / (29 * .6))); let yy = fy + 108;
      for (let p = 0; p < o.code.length && yy < base + 20; p += per, yy += 40) ctx.fillText(o.code.slice(p, p + per), rx, yy);
    }
    ctx.textAlign = 'right'; ctx.font = `700 44px ${F.fd}`; ctx.fillStyle = RED; ctx.fillText('RE:Joltance', W - PAD, base + 36);

    }
    return new Promise((res, rej) => cv.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/png'));
  }
  window.RJShare = { render, drawCard, ensureArt, artOf, frameImg, CW, CH }; // drawCard & co. are also used by export-cards.html
})();
