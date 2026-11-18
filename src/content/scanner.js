(() => {
  const HUD_ID = 'wcag22-express-auditor-hud';
  const SIM_STYLE_ID = 'wcag22-live-fix-sim-style';

  const INTERACTIVE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([type="hidden"]):not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'summary',
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="switch"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[onclick]'
  ].join(',');

  const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([type="hidden"]):not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'summary',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');


  const NORMATIVE_INLINE = {
    '1.1.1': { enClause: 'EN 301 549 Cl. 9.1.1.1', eaaLaw: 'EU 2019/882 Annex I Sec. III(c)' },
    '1.3.1': { enClause: 'EN 301 549 Cl. 9.1.3.1', eaaLaw: 'EU 2019/882 Annex I Sec. III(c)' },
    '1.4.3': { enClause: 'EN 301 549 Cl. 9.1.4.3', eaaLaw: 'EU 2019/882 Annex I Sec. I(2)(b) & III(c)' },
    '2.4.3': { enClause: 'EN 301 549 Cl. 9.2.4.3', eaaLaw: 'EU 2019/882 Annex I Sec. III(c)' },
    '2.4.4': { enClause: 'EN 301 549 Cl. 9.2.4.4', eaaLaw: 'EU 2019/882 Annex I Sec. III(c)' },
    '2.4.7': { enClause: 'EN 301 549 Cl. 9.2.4.7', eaaLaw: 'EU 2019/882 Annex I Sec. III(c)' },
    '2.4.11': { enClause: 'EN 301 549 V4.1.1 Cl. 9.2.4.11', eaaLaw: 'EU 2019/882 Annex I Sec. III(c)' },
    '2.4.13': { enClause: 'WCAG 2.2 SC 2.4.13 (EN 9.2.4.7)', eaaLaw: 'EU 2019/882 Annex I Sec. III(c)' },
    '2.5.7': { enClause: 'EN 301 549 V4.1.1 Cl. 9.2.5.7', eaaLaw: 'EU 2019/882 Annex I Sec. III(c)' },
    '2.5.8': { enClause: 'EN 301 549 V4.1.1 Cl. 9.2.5.8', eaaLaw: 'EU 2019/882 Annex I Sec. I(2)(c) & III(c)' },
    '3.1.1': { enClause: 'EN 301 549 Cl. 9.3.1.1', eaaLaw: 'EU 2019/882 Annex I Sec. III(c)' },
    '3.2.6': { enClause: 'EN 301 549 V4.1.1 Cl. 9.3.2.6', eaaLaw: 'EU 2019/882 Art. 13 & Annex I' },
    '3.3.2': { enClause: 'EN 301 549 Cl. 9.3.3.2', eaaLaw: 'EU 2019/882 Annex I Sec. III(c) & IV(g)' },
    '3.3.7': { enClause: 'EN 301 549 V4.1.1 Cl. 9.3.3.7', eaaLaw: 'EU 2019/882 Annex I Sec. IV(g)' },
    '3.3.8': { enClause: 'EN 301 549 V4.1.1 Cl. 9.3.3.8', eaaLaw: 'EU 2019/882 Annex I Sec. IV(g)(ii)' },
    '4.1.2': { enClause: 'EN 301 549 Cl. 9.4.1.2', eaaLaw: 'EU 2019/882 Annex I Sec. III(c)' },
    'EN 301 549': { enClause: 'EN 301 549 V4.1.1 Cl. 9.6', eaaLaw: 'EU 2019/882 Art. 13(4) & Art. 15' }
  };

  function getLawMeta(criterion) {
    const ext = globalThis.WCAG22_NORMATIVE_DB?.lookupClause?.(criterion, 'ru');
    if (ext) return { enClause: ext.enClause, eaaLaw: ext.eaaArticle, citation: ext.citation };
    const fb = NORMATIVE_INLINE[criterion] || { enClause: `EN 301 549 Cl. 9.${criterion}`, eaaLaw: 'EU 2019/882 Annex I' };
    return { ...fb, citation: `${fb.enClause} · ${fb.eaaLaw}` };
  }

  function getElementWin(el) {
    return (el && el.ownerDocument && el.ownerDocument.defaultView) || window;
  }

  function getParentAcrossShadow(node) {
    if (!node) return null;
    if (node.parentElement) return node.parentElement;
    const root = node.getRootNode && node.getRootNode();
    if (root && root.host) return root.host;
    const doc = node.ownerDocument;
    if (doc && doc !== document && doc.defaultView && doc.defaultView.frameElement) {
      return doc.defaultView.frameElement;
    }
    return null;
  }

  function getGlobalViewportRect(el) {
    const r = el.getBoundingClientRect();
    let ox = 0;
    let oy = 0;
    let curDoc = el.ownerDocument;
    while (curDoc && curDoc !== document && curDoc.defaultView && curDoc.defaultView.frameElement) {
      const frame = curDoc.defaultView.frameElement;
      const fr = frame.getBoundingClientRect();
      const fst = getElementWin(frame).getComputedStyle(frame);
      ox += fr.left + (parseFloat(fst.borderLeftWidth) || 0) + (parseFloat(fst.paddingLeft) || 0);
      oy += fr.top + (parseFloat(fst.borderTopWidth) || 0) + (parseFloat(fst.paddingTop) || 0);
      curDoc = frame.ownerDocument;
    }
    return {
      left: r.left + ox,
      top: r.top + oy,
      right: r.right + ox,
      bottom: r.bottom + oy,
      width: r.width,
      height: r.height
    };
  }

  function queryAllDeep(selector, root = document, acc = [], depth = 0) {
    if (!root || depth > 6) return acc;
    try {
      const matched = root.querySelectorAll(selector);
      for (const m of matched) {
        if (m.id === HUD_ID) continue;
        acc.push(m);
      }
    } catch (_) {}

    let allNodes = [];
    try {
      allNodes = root.querySelectorAll('*');
    } catch (_) {
      allNodes = [];
    }
    for (const el of allNodes) {
      if (el.id === HUD_ID) continue;
      if (el.shadowRoot) {
        queryAllDeep(selector, el.shadowRoot, acc, depth + 1);
      }
      if (el.tagName === 'IFRAME') {
        try {
          if (el.contentDocument && el.contentDocument.documentElement) {
            queryAllDeep(selector, el.contentDocument, acc, depth + 1);
          }
        } catch (_) {}
      }
    }
    return acc;
  }

  function clearLiveSimulationArtifacts() {
    const prevStyle = document.getElementById(SIM_STYLE_ID);
    if (prevStyle) prevStyle.remove();
    queryAllDeep('[data-wcag22-sim]').forEach(el => {
      if (el.hasAttribute('data-wcag22-orig-color')) {
        const orig = el.getAttribute('data-wcag22-orig-color');
        if (orig) el.style.color = orig;
        else el.style.removeProperty('color');
        el.removeAttribute('data-wcag22-orig-color');
      }
      el.removeAttribute('data-wcag22-sim');
    });
    window.__wcag22SimActive = false;
  }

  function isElementRendered(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.id === HUD_ID || (el.closest && el.closest(`#${HUD_ID}`))) return false;
    if (el.closest && el.closest('[hidden], [inert], [aria-hidden="true"]')) return false;

    const win = getElementWin(el);
    const style = win.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
      return false;
    }

    let child = el;
    let parent = getParentAcrossShadow(el);
    while (parent && parent !== document.documentElement) {
      if (parent.nodeType === 1) {
        if (parent.hasAttribute('hidden') || parent.hasAttribute('inert') || parent.getAttribute('aria-hidden') === 'true') {
          return false;
        }
        if (parent.tagName === 'DETAILS' && !parent.open && child.tagName !== 'SUMMARY') {
          return false;
        }
        const pWin = getElementWin(parent);
        const ps = pWin.getComputedStyle(parent);
        if (ps.display === 'none' || ps.visibility === 'hidden' || parseFloat(ps.opacity) === 0) {
          return false;
        }
        const clips = ['hidden', 'clip'].includes(ps.overflow) ||
          ['hidden', 'clip'].includes(ps.overflowY) ||
          ['hidden', 'clip'].includes(ps.overflowX);
        if (clips) {
          const pr = parent.getBoundingClientRect();
          if (pr.width < 1 || pr.height < 1) return false;
        }
      }
      child = parent;
      parent = getParentAcrossShadow(parent);
    }

    const rect = getGlobalViewportRect(el);
    return rect.width > 0.5 && rect.height > 0.5;
  }

  function normalizeTokenDigits(str) {
    return String(str || '').replace(/\d{2,}/g, '#').replace(/-\d+\b/g, '-#');
  }

  function getComponentGroupKey(el) {
    if (!el || el.nodeType !== 1) return 'unknown';
    const tag = el.tagName.toLowerCase();
    const idSig = el.id ? `#${normalizeTokenDigits(el.id)}` : '';
    const cls = el.classList && el.classList.length
      ? '.' + Array.from(el.classList).slice(0, 3).map(normalizeTokenDigits).join('.')
      : '';
    const p = el.parentElement;
    const pSig = p && p !== document.body
      ? `${p.tagName.toLowerCase()}${p.classList && p.classList.length ? '.' + Array.from(p.classList).slice(0, 2).map(normalizeTokenDigits).join('.') : ''}`
      : 'root';
    if (cls) return `${pSig}>${tag}${cls}`;
    if (idSig) return `${pSig}>${tag}${idSig}`;
    return `${pSig}>${tag}`;
  }

  function getReadableSelector(el) {
    if (!el || el.nodeType !== 1) return 'unknown';
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.body && parts.length < 4) {
      let part = cur.tagName.toLowerCase();
      if (cur.classList && cur.classList.length > 0) {
        const cls = Array.from(cur.classList)
          .filter(Boolean)
          .slice(0, 2)
          .map(c => CSS.escape(c))
          .join('.');
        if (cls) part += `.${cls}`;
      }
      const parent = cur.parentElement;
      if (parent) {
        const sameTag = Array.from(parent.children).filter(s => s.tagName === cur.tagName);
        if (sameTag.length > 1) {
          part += `:nth-of-type(${sameTag.indexOf(cur) + 1})`;
        }
      }
      parts.unshift(part);
      if (cur.id) break;
      cur = parent;
    }
    return parts.join(' > ') || el.tagName.toLowerCase();
  }

  function getSnippetText(el) {
    const label = (
      el.getAttribute('aria-label') ||
      el.getAttribute('title') ||
      el.getAttribute('placeholder') ||
      el.innerText ||
      el.value ||
      ''
    ).replace(/\s+/g, ' ').trim();
    return label ? label.slice(0, 64) : `<${el.tagName.toLowerCase()}>`;
  }

  function getLayerRoot(el) {
    let cur = el;
    while (cur && cur !== document.body && cur !== document.documentElement) {
      const st = window.getComputedStyle(cur);
      if (st.position === 'fixed' || st.position === 'sticky') {
        return cur;
      }
      if (st.position === 'absolute' && cur.getAttribute('role') === 'dialog') {
        return cur;
      }
      cur = cur.parentElement;
    }
    return document.body;
  }

  function getCanonicalActionKey(el) {
    const anchor = el.tagName === 'A' ? el : el.closest('a[href]');
    if (anchor && anchor.href) {
      const rawHref = (anchor.getAttribute('href') || '').trim();
      if (!rawHref || rawHref === '#' || /^javascript:/i.test(rawHref)) return null;
      try {
        const u = new URL(anchor.href, window.location.href);
        return `href:${u.origin}${u.pathname}${u.search}${u.hash}`;
      } catch (_) {
        return `href:${anchor.href}`;
      }
    }
    return null;
  }

  function isInlineTextException(el, style) {
    if (!['inline', 'inline-block'].includes(style.display)) return false;
    const parent = el.parentElement;
    if (!parent) return false;
    if (['NAV', 'HEADER'].includes(parent.tagName) || parent.closest('nav, [role="navigation"], [role="menubar"]')) {
      if (style.display !== 'inline') return false;
    }
    const pStyle = window.getComputedStyle(parent);
    if (pStyle.display.includes('flex') || pStyle.display.includes('grid')) return false;
    const clone = parent.cloneNode(true);
    clone.querySelectorAll('a, button, input, select, textarea').forEach(n => n.remove());
    const surroundingProse = (clone.textContent || '').replace(/\s+/g, ' ').trim();
    return surroundingProse.length >= 12;
  }

  function isNativeUnstyledControl(el, style) {
    if (!['INPUT', 'SELECT', 'SUMMARY'].includes(el.tagName)) return false;
    if (el.tagName === 'SUMMARY') return true;
    const type = (el.getAttribute('type') || '').toLowerCase();
    if (['button', 'submit', 'reset', 'image'].includes(type)) return false;
    if (el.style.width || el.style.height) return false;
    return style.appearance !== 'none' && style.webkitAppearance !== 'none';
  }

  function circleIntersectsRect(cx, cy, radius, rect) {
    const nearestX = Math.max(rect.left, Math.min(cx, rect.right));
    const nearestY = Math.max(rect.top, Math.min(cy, rect.bottom));
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    return (dx * dx + dy * dy) < ((radius - 0.05) * (radius - 0.05));
  }

  function auditTargetSize258() {
    const nodes = queryAllDeep(INTERACTIVE_SELECTOR).filter(isElementRendered);
    const targets = nodes.map(el => {
      const rect = getGlobalViewportRect(el);
      const style = getElementWin(el).getComputedStyle(el);
      const undersized = rect.width < 23.95 || rect.height < 23.95;
      return {
        el,
        rect,
        style,
        layerRoot: getLayerRoot(el),
        actionKey: getCanonicalActionKey(el),
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2,
        undersized
      };
    });

    const compliantActionKeys = new Set();
    for (const t of targets) {
      if (!t.undersized && t.actionKey) {
        compliantActionKeys.add(t.actionKey);
      }
    }

    const issues = [];
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      if (!t.undersized) continue;
      if (isInlineTextException(t.el, t.style)) continue;
      if (isNativeUnstyledControl(t.el, t.style)) continue;
      if (t.actionKey && compliantActionKeys.has(t.actionKey)) continue;

      const wrappingLabel = t.el.closest('label');
      if (wrappingLabel) {
        const lRect = wrappingLabel.getBoundingClientRect();
        if (lRect.width >= 24 && lRect.height >= 24) continue;
      }

      const collisions = [];
      for (let j = 0; j < targets.length; j++) {
        if (i === j) continue;
        const other = targets[j];
        if (t.el.contains(other.el) || other.el.contains(t.el)) continue;
        if (t.layerRoot !== other.layerRoot) continue;
        if (t.actionKey && other.actionKey && t.actionKey === other.actionKey) continue;

        const hitsBox = circleIntersectsRect(t.cx, t.cy, 12, other.rect);
        const hitsOtherCircle = other.undersized &&
          Math.hypot(t.cx - other.cx, t.cy - other.cy) < 23.9;

        if (hitsBox || hitsOtherCircle) {
          collisions.push(getReadableSelector(other.el));
        }
      }

      const w = Math.round(t.rect.width * 10) / 10;
      const h = Math.round(t.rect.height * 10) / 10;
      const padX = Math.max(0, Math.ceil((24 - t.rect.width) / 2));
      const padY = Math.max(0, Math.ceil((24 - t.rect.height) / 2));

      if (collisions.length > 0) {
        issues.push({
          _el: t.el,
          code: 'TARGET_COLLISION',
          criterion: '2.5.8',
          level: 'AA',
          severity: 'fail',
          hudCallout: `${w}×${h}px < 24px`,
          title: 'Target Size (Minimum) < 24x24 CSS px with spacing collision',
          elementLabel: getSnippetText(t.el),
          selector: getReadableSelector(t.el),
          componentGroupKey: getComponentGroupKey(t.el),
          params: { w, h, neighbor: collisions[0] },
          actual: `${w} x ${h} px — 24px circle intersects ${collisions[0]}`,
          fixCode: `min-width: 24px; min-height: 24px; padding: ${padY}px ${padX}px;`,
          bbox: { x: t.rect.left + window.scrollX, y: t.rect.top + window.scrollY, w: t.rect.width, h: t.rect.height }
        });
      } else {
        issues.push({
          _el: t.el,
          code: 'TARGET_SPACING_PASS',
          criterion: '2.5.8',
          level: 'AA-spacing',
          severity: 'warning',
          hudCallout: `${w}×${h}px (риск < 24px)`,
          title: 'Undersized target (< 24x24 px) relies on spacing exception',
          elementLabel: getSnippetText(t.el),
          selector: getReadableSelector(t.el),
          componentGroupKey: getComponentGroupKey(t.el),
          params: { w, h },
          actual: `${w} x ${h} px (passes via 24px circle spacing)`,
          fixCode: `min-width: 24px; min-height: 24px;`,
          bbox: { x: t.rect.left + window.scrollX, y: t.rect.top + window.scrollY, w: t.rect.width, h: t.rect.height }
        });
      }
    }
    return { issues, checkedCount: targets.length };
  }

  function parseRgba(colorStr) {
    if (!colorStr) return null;
    const m = colorStr.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/i);
    if (!m) return null;
    return {
      r: Number(m[1]),
      g: Number(m[2]),
      b: Number(m[3]),
      a: m[4] === undefined ? 1 : Number(m[4])
    };
  }

  function getEffectiveBackgroundRgb(el) {
    let cur = el;
    while (cur && cur !== document.documentElement) {
      const bg = parseRgba(window.getComputedStyle(cur).backgroundColor);
      if (bg && bg.a >= 0.85) return bg;
      cur = cur.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  }

  function relativeLuminance({ r, g, b }) {
    const chan = [r, g, b].map(v => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
  }

  function contrastRatio(c1, c2) {
    const l1 = relativeLuminance(c1);
    const l2 = relativeLuminance(c2);
    const bright = Math.max(l1, l2);
    const dark = Math.min(l1, l2);
    return (bright + 0.05) / (dark + 0.05);
  }

  function findOverlayAncestor(node, focusedEl) {
    let cur = node;
    while (cur && cur !== document.body && cur !== document.documentElement) {
      if (cur.contains(focusedEl)) return null;
      const st = window.getComputedStyle(cur);
      if (st.position === 'fixed' || st.position === 'sticky') {
        return cur;
      }
      if (st.position === 'absolute') {
        const z = parseInt(st.zIndex, 10);
        if (!Number.isNaN(z) && z >= 10) return cur;
      }
      cur = cur.parentElement;
    }
    return null;
  }

  function isOversizedScrollContainer(el, rect) {
    if (['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY'].includes(el.tagName)) return false;
    if (rect.height > window.innerHeight * 0.55 || (rect.width > window.innerWidth * 0.7 && rect.height > 220)) {
      if (el.querySelector('a[href], button')) return true;
    }
    return false;
  }

  function collectSuppressedFocusRules(doc) {
    const suppressedBase = [];
    const suppressedFocus = [];
    const restoredFocus = [];
    try {
      for (const sheet of Array.from(doc.styleSheets || [])) {
        let rules;
        try { rules = sheet.cssRules; } catch (_) { continue; }
        if (!rules) continue;
        for (const r of Array.from(rules)) {
          if (!r.selectorText || !r.style) continue;
          const outVal = (r.style.outline || '').toLowerCase();
          const outStyle = (r.style.outlineStyle || '').toLowerCase();
          const outW = r.style.outlineWidth || '';
          const killsOutline = outVal === 'none' || outVal === '0' || outVal === '0px' || outStyle === 'none' || outW === '0px' || outW === '0';
          const addsIndicator = Boolean(
            (r.style.boxShadow && r.style.boxShadow !== 'none') ||
            (r.style.borderColor && r.style.borderColor !== 'initial') ||
            (outStyle && outStyle !== 'none' && outW !== '0px' && outW !== '0')
          );

          const rawSels = r.selectorText.split(',').map(s => s.trim()).filter(Boolean);
          for (const sel of rawSels) {
            const hasFocusPseudo = /:focus(-visible)?\b/.test(sel);
            const baseSel = sel.replace(/:focus-visible\b/g, '').replace(/:focus\b/g, '').trim() || '*';
            if (hasFocusPseudo) {
              if (addsIndicator && !killsOutline) restoredFocus.push(baseSel);
              else if (killsOutline && !addsIndicator) suppressedFocus.push(baseSel);
              else if (addsIndicator) restoredFocus.push(baseSel);
            } else if (killsOutline && !addsIndicator) {
              suppressedBase.push(baseSel);
            }
          }
        }
      }
    } catch (_) {}
    return { suppressedBase, suppressedFocus, restoredFocus };
  }

  function elementHasSuppressedFocusRing(el, ruleCacheMap) {
    const doc = el.ownerDocument || document;
    if (!ruleCacheMap.has(doc)) {
      ruleCacheMap.set(doc, collectSuppressedFocusRules(doc));
    }
    const rules = ruleCacheMap.get(doc);

    const inlOut = (el.style?.outline || '').toLowerCase().trim();
    const inlStyle = (el.style?.outlineStyle || '').toLowerCase().trim();
    const inlW = (el.style?.outlineWidth || '').toLowerCase().trim();
    const inlineKills = inlOut === 'none' || inlOut === '0' || inlOut === '0px' || inlStyle === 'none' || inlW === '0px' || inlW === '0';
    const inlineAdds = Boolean(el.style?.boxShadow && el.style.boxShadow !== 'none');

    let cssKills = false;
    let cssRestores = false;
    for (const s of [...rules.suppressedBase, ...rules.suppressedFocus]) {
      try { if (el.matches(s)) { cssKills = true; break; } } catch (_) {}
    }
    for (const s of rules.restoredFocus) {
      try { if (el.matches(s)) { cssRestores = true; break; } } catch (_) {}
    }

    if (inlineKills && !inlineAdds && !cssRestores) return true;
    if (cssKills && !cssRestores && !inlineAdds) return true;
    return false;
  }

  // Zero-Blur, Uncapped Focus & Sticky Occlusion Engine (up to 1,500 controls, 0 focus/blur side-effects on live forms!)
  function auditFocusAndTabOrder(maxNodes = 1500) {
    const hudEl = document.getElementById(HUD_ID);
    const prevHudDisplay = hudEl ? hudEl.style.display : '';
    if (hudEl) hudEl.style.display = 'none';

    const rawFocusables = queryAllDeep(FOCUSABLE_SELECTOR)
      .filter(el => isElementRendered(el) && el.tabIndex >= 0);

    const positiveTabs = rawFocusables
      .filter(el => el.tabIndex > 0)
      .sort((a, b) => a.tabIndex - b.tabIndex);
    const normalTabs = rawFocusables.filter(el => el.tabIndex === 0);
    const focusables = [...positiveTabs, ...normalTabs].slice(0, maxNodes);

    const ruleCacheMap = new Map();
    const issues = [];
    const tabStops = [];

    focusables.forEach((el, idx) => {
      const r0 = getGlobalViewportRect(el);
      tabStops.push({
        order: idx + 1,
        x: Math.round(r0.left + window.scrollX + Math.min(14, r0.width / 2)),
        y: Math.round(r0.top + window.scrollY + Math.min(14, r0.height / 2)),
        w: Math.round(r0.width),
        h: Math.round(r0.height),
        label: getSnippetText(el),
        selector: getReadableSelector(el)
      });

      const explicitTabAttr = parseInt(el.getAttribute('tabindex') || '0', 10);
      if (explicitTabAttr > 0) {
        issues.push({
          _el: el,
          code: 'TABINDEX_POSITIVE',
          criterion: '2.4.3',
          level: 'A',
          severity: 'warning',
          hudCallout: `tabindex="${explicitTabAttr}"`,
          title: `Positive tabindex="${explicitTabAttr}" disrupts natural keyboard focus order`,
          elementLabel: getSnippetText(el),
          selector: getReadableSelector(el),
          componentGroupKey: getComponentGroupKey(el),
          params: { tabindex: explicitTabAttr },
          actual: `tabindex="${explicitTabAttr}" forces element ahead of DOM reading order`,
          fixCode: 'Use tabindex="0" and place the element in logical DOM order.',
          bbox: { x: r0.left + window.scrollX, y: r0.top + window.scrollY, w: r0.width, h: r0.height }
        });
      }
    });

    const probedTextGroups = new Set();
    const prevActiveEl = document.activeElement;

    function probeCrossOriginTextFocusSuppressed(el) {
      if (el.ownerDocument !== document) return false;
      const isTextEntry = (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'file', 'color'].includes((el.type || '').toLowerCase())) || el.tagName === 'TEXTAREA';
      if (!isTextEntry) return false;
      if (el.hasAttribute('onblur') || el.hasAttribute('onfocus')) return false;
      const gKey = getComponentGroupKey(el);
      if (probedTextGroups.has(gKey) || probedTextGroups.size >= 10) return false;
      probedTextGroups.add(gKey);

      const stBefore = window.getComputedStyle(el);
      const beforeSig = {
        boxShadow: stBefore.boxShadow,
        borderTopColor: stBefore.borderTopColor,
        borderTopWidth: stBefore.borderTopWidth,
        bg: stBefore.backgroundColor
      };
      try {
        el.focus({ preventScroll: true });
        const stAfter = window.getComputedStyle(el);
        const ow = parseFloat(stAfter.outlineWidth) || 0;
        const hasOut = stAfter.outlineStyle !== 'none' && ow > 0;
        if (!hasOut &&
            stAfter.boxShadow === beforeSig.boxShadow &&
            stAfter.borderTopColor === beforeSig.borderTopColor &&
            stAfter.borderTopWidth === beforeSig.borderTopWidth &&
            stAfter.backgroundColor === beforeSig.bg) {
          return true;
        }
      } catch (_) {}
      return false;
    }

    for (const el of focusables) {
      const r = getGlobalViewportRect(el);
      const win = getElementWin(el);
      const st = win.getComputedStyle(el);

      if (elementHasSuppressedFocusRing(el, ruleCacheMap) || probeCrossOriginTextFocusSuppressed(el)) {
        issues.push({
          _el: el,
          code: 'FOCUS_RING_SUPPRESSED',
          criterion: '2.4.7',
          level: 'AA',
          severity: 'fail',
          hudCallout: 'НЕТ РАМКИ ФОКУСА (Tab)',
          title: 'Keyboard focus indicator suppressed (outline: none without replacement)',
          elementLabel: getSnippetText(el),
          selector: getReadableSelector(el),
          componentGroupKey: getComponentGroupKey(el),
          params: {},
          actual: 'outline: none without replacement :focus/:focus-visible indicator',
          fixCode: ':focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }',
          bbox: { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }
        });
      } else {
        const outlineW = parseFloat(st.outlineWidth) || 0;
        if (st.outlineStyle !== 'none' && outlineW > 0) {
          const outColor = parseRgba(st.outlineColor);
          if (outColor && outColor.a > 0.1) {
            const bgColor = getEffectiveBackgroundRgb(getParentAcrossShadow(el) || el);
            const ratio = Math.round(contrastRatio(outColor, bgColor) * 100) / 100;
            if (ratio < 3.0) {
              issues.push({
                _el: el,
                code: 'FOCUS_APPEARANCE_LOW',
                criterion: '2.4.13',
                level: 'AAA-warn',
                severity: 'warning',
                hudCallout: `Контраст фокуса ${ratio}:1`,
                title: `Low focus outline contrast (${ratio}:1 < 3:1 recommended)`,
                elementLabel: getSnippetText(el),
                selector: getReadableSelector(el),
                componentGroupKey: getComponentGroupKey(el),
                params: { ratio, outlineW: Math.round(outlineW * 10) / 10 },
                actual: `Focus outline contrast ${ratio}:1 (${Math.round(outlineW * 10) / 10}px width)`,
                fixCode: ':focus-visible { outline: 2px solid #1d4ed8; outline-offset: 2px; }',
                bbox: { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }
              });
            }
          }
        }
      }

      if (el.ownerDocument !== document || isOversizedScrollContainer(el, r)) continue;

      const left = Math.max(0, r.left);
      const right = Math.min(window.innerWidth, r.right);
      const top = Math.max(0, r.top);
      const bottom = Math.min(window.innerHeight, r.bottom);
      if (right - left < 2 || bottom - top < 2) continue;

      const xs = [left + 1, (left + right) / 2, right - 1];
      const ys = [top + 1, (top + bottom) / 2, bottom - 1];

      let unobscuredCount = 0;
      let overlayBlocker = null;

      for (const x of xs) {
        for (const y of ys) {
          const stack = document.elementsFromPoint(x, y);
          const topHit = stack.find(n => {
            if (n.id === HUD_ID) return false;
            const nst = window.getComputedStyle(n);
            return nst.pointerEvents !== 'none' && parseFloat(nst.opacity) > 0.05;
          });

          if (!topHit || el === topHit || (el.contains && el.contains(topHit)) || (topHit.contains && topHit.contains(el))) {
            unobscuredCount++;
            continue;
          }

          const overlay = findOverlayAncestor(topHit, el);
          if (overlay) {
            if (!overlayBlocker) overlayBlocker = overlay;
          } else {
            unobscuredCount++;
          }
        }
      }

      if (unobscuredCount === 0 && overlayBlocker) {
        const blockerRect = overlayBlocker.getBoundingClientRect();
        const blockerH = Math.round(blockerRect.height);
        const blockerSel = getReadableSelector(overlayBlocker);
        issues.push({
          _el: el,
          code: 'FOCUS_OBSCURED_FULL',
          criterion: '2.4.11',
          level: 'AA',
          severity: 'fail',
          hudCallout: `СКРЫТО ПОД ШАПКОЙ (${blockerH}px)`,
          title: 'Focused element is 100% obscured by sticky/fixed overlay (F110)',
          elementLabel: getSnippetText(el),
          selector: getReadableSelector(el),
          componentGroupKey: getComponentGroupKey(el),
          params: { blocker: blockerSel, blockerH, coveredPts: 9 },
          actual: `100% hidden behind ${blockerSel} (${blockerH}px height)`,
          fixCode: `html { scroll-padding-top: ${Math.ceil(blockerH + 16)}px; }`,
          bbox: { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }
        });
      } else if (unobscuredCount > 0 && unobscuredCount < 9 && overlayBlocker) {
        const blockerSel = getReadableSelector(overlayBlocker);
        const coveredPts = 9 - unobscuredCount;
        issues.push({
          _el: el,
          code: 'FOCUS_OBSCURED_PARTIAL',
          criterion: '2.4.11',
          level: 'AAA-warn',
          severity: 'warning',
          hudCallout: `Перекрытие ${coveredPts}/9 тчк`,
          title: `Focused element is partially obscured (${coveredPts}/9 points covered)`,
          elementLabel: getSnippetText(el),
          selector: getReadableSelector(el),
          componentGroupKey: getComponentGroupKey(el),
          params: { blocker: blockerSel, coveredPts },
          actual: `Partially overlapped by ${blockerSel} (${coveredPts}/9 pts)`,
          fixCode: `scroll-margin-top: 96px; scroll-margin-bottom: 96px;`,
          bbox: { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }
        });
      }
    }

    if (prevActiveEl && prevActiveEl !== document.activeElement && typeof prevActiveEl.focus === 'function') {
      try { prevActiveEl.focus({ preventScroll: true }); } catch (_) {}
    }
    if (hudEl) hudEl.style.display = prevHudDisplay;
    return { issues, checkedCount: focusables.length, tabStops };
  }

  function rgbToHex({ r, g, b }) {
    const h = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    return `#${h(r)}${h(g)}${h(b)}`;
  }

  function blendRgbaOver(fg, bg) {
    const a = fg.a === undefined ? 1 : fg.a;
    if (a >= 0.999) return { r: fg.r, g: fg.g, b: fg.b, a: 1 };
    return {
      r: fg.r * a + bg.r * (1 - a),
      g: fg.g * a + bg.g * (1 - a),
      b: fg.b * a + bg.b * (1 - a),
      a: 1
    };
  }

  function resolveCompositedBg(el) {
    const layers = [];
    let cur = el;
    while (cur && cur.nodeType === 1) {
      const st = getElementWin(cur).getComputedStyle(cur);
      if (st.backgroundImage && st.backgroundImage !== 'none') {
        return null; // Skip gradient/photo backdrops to prevent false-positive contrast flags
      }
      const bg = parseRgba(st.backgroundColor);
      if (bg && bg.a > 0.01) {
        layers.unshift(bg);
        if (bg.a >= 0.99) break;
      }
      cur = getParentAcrossShadow(cur);
    }
    let acc = { r: 255, g: 255, b: 255, a: 1 };
    for (const l of layers) {
      acc = blendRgbaOver(l, acc);
    }
    return acc;
  }

  function computeCompliantTextHex(fg, bg, minRatio) {
    const bgLum = relativeLuminance(bg);
    const goDark = bgLum > 0.35;
    for (let step = 0; step <= 40; step++) {
      const t = step / 40;
      const cand = goDark
        ? { r: fg.r * (1 - t), g: fg.g * (1 - t), b: fg.b * (1 - t) }
        : { r: fg.r + (255 - fg.r) * t, g: fg.g + (255 - fg.g) * t, b: fg.b + (255 - fg.b) * t };
      if (contrastRatio(cand, bg) >= minRatio) {
        return rgbToHex(cand);
      }
    }
    return goDark ? '#0f172a' : '#ffffff';
  }

  function getAccessibleName(el) {
    if (!el || el.nodeType !== 1) return '';
    const ariaLbl = (el.getAttribute('aria-label') || '').trim();
    if (ariaLbl) return ariaLbl;

    const labelledBy = (el.getAttribute('aria-labelledby') || '').trim();
    if (labelledBy) {
      const root = (el.getRootNode && el.getRootNode()) || el.ownerDocument || document;
      const parts = labelledBy.split(/\s+/).map(id => {
        const ref = root.getElementById ? root.getElementById(id) : document.getElementById(id);
        return ref ? (ref.textContent || '').trim() : '';
      }).filter(Boolean);
      if (parts.length) return parts.join(' ');
    }

    if (el.tagName === 'INPUT') {
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      if (['button', 'submit', 'reset'].includes(type)) {
        const v = (el.value || '').trim();
        if (v) return v;
      }
      if (type === 'image') {
        const alt = (el.getAttribute('alt') || '').trim();
        if (alt) return alt;
      }
    }

    const txt = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
    if (txt) return txt;

    const imgAlts = Array.from(el.querySelectorAll('img[alt]'))
      .map(i => (i.getAttribute('alt') || '').trim())
      .filter(Boolean);
    if (imgAlts.length) return imgAlts.join(' ');

    const svgTitle = el.querySelector('svg title');
    if (svgTitle && (svgTitle.textContent || '').trim()) {
      return svgTitle.textContent.trim();
    }

    const titleAttr = (el.getAttribute('title') || '').trim();
    if (titleAttr) return titleAttr;

    return '';
  }

  // Foundational WCAG 2.0 / 2.1 Level A & AA Engine (WebAIM Million Top-6: 96% of real-world web errors!)
  function auditFoundationalWcag21() {
    const issues = [];
    let checkedBase = 0;

    // 1. SC 3.1.1 Language of Page (EN 301 549 Clause 9.3.1.1)
    const htmlLang = (document.documentElement.getAttribute('lang') || '').trim();
    checkedBase += 1;
    if (!htmlLang || !/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/.test(htmlLang)) {
      issues.push({
        _el: document.documentElement,
        code: 'HTML_LANG_MISSING',
        criterion: '3.1.1',
        level: 'A',
        severity: 'fail',
        hudCallout: 'НЕТ <html lang>',
        title: 'Document <html> element is missing a valid lang attribute (screen readers mispronounce page)',
        elementLabel: '<html>',
        selector: 'html',
        componentGroupKey: 'root>html[lang]',
        params: { currentLang: htmlLang || 'none' },
        actual: htmlLang ? `Invalid lang="${htmlLang}" on <html>` : 'Missing lang attribute on <html> element',
        fixCode: '<html lang="en"> <!-- or lang="ru" / lang="de" -->',
        bbox: { x: 12, y: 12, w: Math.min(280, window.innerWidth - 24), h: 32 }
      });
    }

    // 2. SC 1.1.1 Non-text Content — Images missing alt (EN 301 549 Clause 9.1.1.1)
    const imgs = queryAllDeep('img').filter(isElementRendered);
    checkedBase += imgs.length;
    for (const img of imgs) {
      const role = (img.getAttribute('role') || '').toLowerCase();
      if (role === 'presentation' || role === 'none') continue;
      if (img.hasAttribute('alt')) continue;
      if ((img.getAttribute('aria-label') || '').trim() || (img.getAttribute('aria-labelledby') || '').trim()) continue;

      const r = getGlobalViewportRect(img);
      const inLink = Boolean(img.closest && img.closest('a[href], button'));
      issues.push({
        _el: img,
        code: 'IMG_ALT_MISSING',
        criterion: '1.1.1',
        level: 'A',
        severity: 'fail',
        hudCallout: 'НЕТ ALT У IMG',
        title: inLink
          ? 'Linked/interactive <img> is missing alt attribute (unannounced action for screen readers)'
          : 'Informative <img> element is missing alt attribute',
        elementLabel: (img.getAttribute('src') || '<img>').split('/').pop().slice(0, 42) || '<img>',
        selector: getReadableSelector(img),
        componentGroupKey: getComponentGroupKey(img),
        params: { inLink },
        actual: 'Image lacks alt attribute (screen readers read raw filename or skip link purpose)',
        fixCode: '<img src="..." alt="Descriptive text"> <!-- or alt="" if decorative -->',
        bbox: { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }
      });
    }

    // 3. SC 4.1.2 / SC 2.4.4 Empty Buttons & Empty Links (EN 301 549 Clause 9.4.1.2 & 9.2.4.4)
    const actionEls = queryAllDeep('button:not([disabled]), a[href], [role="button"], [role="link"]').filter(isElementRendered);
    for (const el of actionEls) {
      const name = getAccessibleName(el);
      if (name) continue;
      const isLink = el.tagName === 'A' || el.getAttribute('role') === 'link';
      const crit = isLink ? '2.4.4' : '4.1.2';
      const r = getGlobalViewportRect(el);
      issues.push({
        _el: el,
        code: 'EMPTY_INTERACTIVE_NAME',
        criterion: crit,
        level: 'A',
        severity: 'fail',
        hudCallout: isLink ? 'ПУСТАЯ ССЫЛКА' : 'КНОПКА БЕЗ ИМЕНИ',
        title: isLink
          ? 'Empty link lacks discernible text or aria-label (SC 2.4.4 / 4.1.2)'
          : 'Button / icon control has no accessible name for assistive technologies (SC 4.1.2)',
        elementLabel: `<${el.tagName.toLowerCase()}>`,
        selector: getReadableSelector(el),
        componentGroupKey: getComponentGroupKey(el),
        params: { kind: isLink ? 'link' : 'button' },
        actual: `Zero accessible name (no text, img[alt], or aria-label on <${el.tagName.toLowerCase()}>)`,
        fixCode: `<${el.tagName.toLowerCase()} aria-label="Action description">...</${el.tagName.toLowerCase()}>`,
        bbox: { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }
      });
    }

    // 4. SC 3.3.2 / SC 1.3.1 Form Inputs Missing Programmatic Label (EN 301 549 Clause 9.3.3.2)
    const formFields = queryAllDeep('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])').filter(isElementRendered);
    for (const field of formFields) {
      const type = (field.getAttribute('type') || 'text').toLowerCase();
      if (['submit', 'reset', 'button', 'image'].includes(type)) continue;

      let hasLabel = Boolean(
        (field.labels && field.labels.length > 0) ||
        (field.closest && field.closest('label')) ||
        (field.getAttribute('aria-label') || '').trim() ||
        (field.getAttribute('aria-labelledby') || '').trim() ||
        (field.getAttribute('title') || '').trim()
      );
      if (!hasLabel && field.id) {
        const root = (field.getRootNode && field.getRootNode()) || field.ownerDocument || document;
        try {
          if (root.querySelector(`label[for="${CSS.escape(field.id)}"]`)) hasLabel = true;
        } catch (_) {}
      }
      if (hasLabel) continue;

      const r = getGlobalViewportRect(field);
      const ph = (field.getAttribute('placeholder') || '').trim();
      issues.push({
        _el: field,
        code: 'FORM_LABEL_MISSING',
        criterion: '3.3.2',
        level: 'A',
        severity: 'fail',
        hudCallout: 'ПОЛЕ БЕЗ LABEL',
        title: 'Form input control lacks programmatic <label> or aria-label',
        elementLabel: ph ? `input "${ph}"` : `<${field.tagName.toLowerCase()} type="${type}">`,
        selector: getReadableSelector(field),
        componentGroupKey: getComponentGroupKey(field),
        params: { hasPlaceholderOnly: Boolean(ph) },
        actual: ph
          ? `Uses placeholder="${ph}" only without persistent <label> or aria-label`
          : 'Unlabeled form control (screen readers announce blank edit field)',
        fixCode: '<label for="field-id">Field Label</label>\n<input id="field-id" ...>',
        bbox: { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }
      });
    }

    // 5. SC 1.4.3 Contrast (Minimum) (EN 301 549 Clause 9.1.4.3) — with live AFTER color fix!
    const textCandidates = queryAllDeep('p, span, a, button, label, li, td, th, h1, h2, h3, h4, h5, h6, small, strong, em, div')
      .slice(0, 900);
    for (const el of textCandidates) {
      if (!isElementRendered(el)) continue;
      let directText = '';
      for (const node of el.childNodes) {
        if (node.nodeType === 3) directText += node.nodeValue || '';
      }
      directText = directText.replace(/\s+/g, ' ').trim();
      if (directText.length < 2) continue;

      const win = getElementWin(el);
      const st = win.getComputedStyle(el);
      const fgRaw = parseRgba(st.color);
      if (!fgRaw || fgRaw.a < 0.15) continue;

      const bg = resolveCompositedBg(el);
      if (!bg) continue; // Gradient/background-image present -> skip to guarantee zero false positives
      const fg = blendRgbaOver(fgRaw, bg);

      const fontSize = parseFloat(st.fontSize) || 16;
      const weight = parseInt(st.fontWeight, 10) || (st.fontWeight === 'bold' ? 700 : 400);
      const isLargeText = fontSize >= 24 || (fontSize >= 18.66 && weight >= 700);
      const required = isLargeText ? 3.0 : 4.5;

      const ratio = Math.round(contrastRatio(fg, bg) * 100) / 100;
      checkedBase += 1;

      if (ratio < required - 0.03) {
        const r = getGlobalViewportRect(el);
        const fgHex = rgbToHex(fg);
        const bgHex = rgbToHex(bg);
        const fixedHex = computeCompliantTextHex(fg, bg, required + 0.2);
        issues.push({
          _el: el,
          code: 'TEXT_CONTRAST_LOW',
          criterion: '1.4.3',
          level: 'AA',
          severity: 'fail',
          hudCallout: `КОНТРАСТ ${ratio}:1`,
          title: `Insufficient text color contrast (${ratio}:1 < ${required}:1 required)`,
          elementLabel: directText.slice(0, 48),
          selector: getReadableSelector(el),
          componentGroupKey: getComponentGroupKey(el),
          params: { ratio, required, fgHex, bgHex, fixedHex, isLargeText },
          actual: `Foreground ${fgHex} on ${bgHex} yields ${ratio}:1 (minimum ${required}:1)`,
          fixCode: `color: ${fixedHex}; /* achieves >= ${required}:1 on ${bgHex} */`,
          bbox: { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }
        });
      }
    }

    // 6. SC 1.3.1 Heading Level Hierarchy Advisory (EN 301 549 Clause 9.1.3.1)
    const headings = queryAllDeep('h1, h2, h3, h4, h5, h6').filter(isElementRendered);
    let prevLevel = 0;
    for (const h of headings) {
      const lvl = parseInt(h.tagName.slice(1), 10);
      if (prevLevel > 0 && lvl > prevLevel + 1) {
        const r = getGlobalViewportRect(h);
        issues.push({
          _el: h,
          code: 'HEADING_ORDER_SKIP',
          criterion: '1.3.1',
          level: 'A-warn',
          severity: 'warning',
          hudCallout: `Прыжок H${prevLevel}→H${lvl}`,
          title: `Skipped heading hierarchy level (<h${prevLevel}> jumped directly to <h${lvl}>)`,
          elementLabel: getSnippetText(h),
          selector: getReadableSelector(h),
          componentGroupKey: getComponentGroupKey(h),
          params: { fromLevel: prevLevel, toLevel: lvl },
          actual: `Heading level jumped from <h${prevLevel}> to <h${lvl}>`,
          fixCode: `Use <h${prevLevel + 1}> sequentially and style font size via CSS.`,
          bbox: { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }
        });
      }
      prevLevel = lvl;
    }

    return { issues, checkedCount: checkedBase };
  }

  function auditAccessibleAuthAndRedundantEntry() {
    const issues = [];
    const authInputs = queryAllDeep('input[type="password"], input[autocomplete*="password"], input[autocomplete="one-time-code"]').filter(isElementRendered);

    for (const input of authInputs) {
      const rect = input.getBoundingClientRect();
      const inlinePasteAttr = (input.getAttribute('onpaste') || '').toLowerCase();
      let pasteBlocked = inlinePasteAttr.includes('return false') || inlinePasteAttr.includes('preventdefault');

      if (!pasteBlocked) {
        try {
          const probeEvent = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
          input.dispatchEvent(probeEvent);
          pasteBlocked = probeEvent.defaultPrevented;
        } catch (_) {}
      }

      if (pasteBlocked) {
        issues.push({
          _el: input,
          code: 'AUTH_PASTE_BLOCKED',
          criterion: '3.3.8',
          level: 'AA',
          severity: 'fail',
          hudCallout: 'ВСТАВКА ПАРОЛЯ БЛОКИРОВАНА',
          title: 'Credential field blocks clipboard paste (breaks password managers)',
          elementLabel: getSnippetText(input),
          selector: getReadableSelector(input),
          componentGroupKey: getComponentGroupKey(input),
          params: {},
          actual: 'paste event cancelled via preventDefault() or inline onpaste',
          fixCode: 'Remove paste event blockers and set autocomplete="current-password".',
          bbox: { x: rect.left + window.scrollX, y: rect.top + window.scrollY, w: rect.width, h: rect.height }
        });
      }

      if ((input.getAttribute('autocomplete') || '').toLowerCase() === 'off') {
        issues.push({
          _el: input,
          code: 'AUTH_AUTOCOMPLETE_OFF',
          criterion: '3.3.8',
          level: 'AA',
          severity: 'warning',
          hudCallout: 'autocomplete="off"',
          title: 'Credential field disables autofill (autocomplete="off")',
          elementLabel: getSnippetText(input),
          selector: getReadableSelector(input),
          componentGroupKey: getComponentGroupKey(input),
          params: {},
          actual: 'autocomplete="off" on authentication input',
          fixCode: 'autocomplete="current-password"',
          bbox: { x: rect.left + window.scrollX, y: rect.top + window.scrollY, w: rect.width, h: rect.height }
        });
      }
    }

    const forms = Array.from(document.querySelectorAll('form, [role="form"], body'));
    const seenSplitContainers = new Set();
    for (const container of forms) {
      const singleCharInputs = Array.from(container.querySelectorAll('input[maxlength="1"]')).filter(isElementRendered);
      if (singleCharInputs.length >= 4 && singleCharInputs.length <= 8) {
        const parentGroup = singleCharInputs[0].parentElement;
        if (parentGroup && !seenSplitContainers.has(parentGroup)) {
          seenSplitContainers.add(parentGroup);
          const hasOtc = singleCharInputs.some(inp => (inp.getAttribute('autocomplete') || '').includes('one-time-code'));
          if (!hasOtc) {
            const r = singleCharInputs[0].getBoundingClientRect();
            issues.push({
              _el: singleCharInputs[0],
              code: 'AUTH_OTP_SPLIT_NO_PASTE',
              criterion: '3.3.8',
              level: 'AA',
              severity: 'warning',
              hudCallout: 'OTP без вставки кода',
              title: `Split ${singleCharInputs.length}-digit verification inputs lack autocomplete="one-time-code"`,
              elementLabel: getSnippetText(singleCharInputs[0]),
              selector: getReadableSelector(singleCharInputs[0]),
              componentGroupKey: getComponentGroupKey(singleCharInputs[0]),
              params: { boxes: singleCharInputs.length },
              actual: `${singleCharInputs.length} separate maxlength="1" inputs without one-time-code autofill`,
              fixCode: 'Add autocomplete="one-time-code" and distribute multi-digit paste events across boxes.',
              bbox: { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }
            });
          }
        }
      }
    }

    const captchaCandidates = Array.from(document.querySelectorAll(
      'iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="arkoselabs"], .g-recaptcha, .h-captcha, img[alt*="captcha" i]'
    )).filter(isElementRendered);

    if (captchaCandidates.length > 0) {
      const hasPasskeyOrOAuth = Boolean(document.querySelector(
        '[data-webauthn], button[id*="passkey" i], button[class*="passkey" i], a[href*="oauth"], button[class*="google" i], button[class*="apple" i]'
      ));
      for (const cap of captchaCandidates.slice(0, 2)) {
        const r = cap.getBoundingClientRect();
        issues.push({
          _el: cap,
          code: 'AUTH_COGNITIVE_CAPTCHA',
          criterion: '3.3.8',
          level: 'AA',
          severity: 'manual',
          hudCallout: 'CAPTCHA Puzzle',
          title: 'CAPTCHA challenge detected — verify non-cognitive or object-recognition alternative',
          elementLabel: getSnippetText(cap),
          selector: getReadableSelector(cap),
          componentGroupKey: getComponentGroupKey(cap),
          params: { hasAlt: hasPasskeyOrOAuth },
          actual: 'Visual/interactive CAPTCHA widget present in form flow',
          fixCode: 'Prefer Turnstile/WebAuthn passkeys, magic email links (G218), or non-puzzle verification.',
          bbox: { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }
        });
      }
    }

    const allInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="password"]), select')).filter(isElementRendered);
    const hasShipping = allInputs.some(i => /ship/i.test(`${i.name} ${i.id} ${i.getAttribute('autocomplete') || ''}`));
    const hasBilling = allInputs.some(i => /bill/i.test(`${i.name} ${i.id} ${i.getAttribute('autocomplete') || ''}`));
    if (hasShipping && hasBilling) {
      const hasSameCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]')).some(cb => {
        const lbl = cb.closest('label')?.innerText || document.querySelector(`label[for="${CSS.escape(cb.id)}"]`)?.innerText || '';
        return /(same as|совпадает|как адрес доставки|identisch)/i.test(`${lbl} ${cb.name} ${cb.id}`);
      });
      if (!hasSameCheckbox) {
        const billInput = allInputs.find(i => /bill/i.test(`${i.name} ${i.id} ${i.getAttribute('autocomplete') || ''}`));
        const r = billInput.getBoundingClientRect();
        issues.push({
          _el: billInput,
          code: 'REDUNDANT_ENTRY_RISK',
          criterion: '3.3.7',
          level: 'A',
          severity: 'warning',
          hudCallout: 'Дубль ввода адреса',
          title: 'Separate Shipping & Billing inputs detected without a "Same as shipping" toggle',
          elementLabel: getSnippetText(billInput),
          selector: getReadableSelector(billInput),
          componentGroupKey: getComponentGroupKey(billInput),
          params: {},
          actual: 'Duplicate address fields require manual re-entry',
          fixCode: 'Add a "Billing address same as shipping" checkbox that auto-populates fields (SC 3.3.7).',
          bbox: { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }
        });
      }
    }

    return { issues, checkedCount: authInputs.length + allInputs.length };
  }

  function hasSinglePointerAlternative(el) {
    const scope = el.closest(
      '.swiper, [class*="carousel" i], [class*="slider" i], [role="region"], [aria-roledescription="carousel"], section, form'
    ) || el.parentElement;
    if (!scope) return false;
    const altBtns = Array.from(scope.querySelectorAll(
      'button:not([disabled]), [role="button"], input[type="number"], [class*="prev" i], [class*="next" i]'
    )).filter(btn => btn !== el && !el.contains(btn) && isElementRendered(btn));
    return altBtns.length > 0;
  }

  function auditDraggingCandidates257() {
    const dragSelectors = '[draggable="true"], [role="slider"], [data-rbd-draggable-id], .swiper-wrapper, .sortable';
    const els = Array.from(document.querySelectorAll(dragSelectors)).filter(isElementRendered);
    const issues = [];
    for (const el of els) {
      if (hasSinglePointerAlternative(el)) continue;

      const rect = el.getBoundingClientRect();
      issues.push({
        _el: el,
        code: 'DRAG_MANUAL_CHECK',
        criterion: '2.5.7',
        level: 'AA',
        severity: 'manual',
        hudCallout: 'Drag без кнопок',
        title: 'Draggable / slider widget has no detected single-pointer buttons nearby',
        elementLabel: getSnippetText(el),
        selector: getReadableSelector(el),
        componentGroupKey: getComponentGroupKey(el),
        params: { tag: el.tagName.toLowerCase() },
        actual: `Drag/slider control (${el.tagName.toLowerCase()}) without adjacent Prev/Next or +/- buttons`,
        fixCode: 'Provide explicit single-click Prev/Next, Up/Down, or numeric input controls (SC 2.5.7).',
        bbox: { x: rect.left + window.scrollX, y: rect.top + window.scrollY, w: rect.width, h: rect.height }
      });
    }
    return { issues, checkedCount: els.length };
  }

  function auditAccessibilityOverlays() {
    const overlaySignatures = [
      { name: 'accessiBe', sel: 'script[src*="acsbapp.com"], #acsb-trigger, [class*="acsb-"]' },
      { name: 'UserWay', sel: 'script[src*="userway.org"], #userwayAccessibilityIcon, [class*="uai-"]' },
      { name: 'AudioEye', sel: 'script[src*="audioeye.com"], #ae_launcher' },
      { name: 'EqualWeb', sel: 'script[src*="equalweb.com"], #INDmenu-btn' }
    ];
    const issues = [];
    for (const sig of overlaySignatures) {
      const node = document.querySelector(sig.sel);
      if (node) {
        const rect = isElementRendered(node)
          ? node.getBoundingClientRect()
          : { left: 16, top: 16, width: 48, height: 48 };
        issues.push({
          _el: isElementRendered(node) ? node : null,
          code: 'EAA_OVERLAY_DETECTED',
          criterion: 'EN 301 549',
          level: 'EAA-Risk',
          severity: 'warning',
          hudCallout: `Оверлей ${sig.name}`,
          title: `Third-party overlay widget (${sig.name}) detected — insufficient for EAA compliance`,
          elementLabel: sig.name,
          selector: getReadableSelector(node),
          componentGroupKey: `overlay:${sig.name}`,
          params: { vendor: sig.name },
          actual: `${sig.name} overlay script/widget injected on page`,
          fixCode: 'Remediate underlying HTML/CSS/ARIA source; EU regulators (EDF/IAAP) do not accept overlays as EAA compliance.',
          bbox: { x: rect.left + window.scrollX, y: rect.top + window.scrollY, w: Math.max(24, rect.width), h: Math.max(24, rect.height) }
        });
      }
    }
    return issues;
  }

  function extractConsistentHelpMechanisms() {
    const mechanisms = [];
    const seenTypes = new Set();

    function getLandmarkZone(el) {
      if (el.closest('header, [role="banner"]')) return '1-header';
      if (el.closest('nav, [role="navigation"]')) return '2-nav';
      if (el.closest('footer, [role="contentinfo"]')) return '4-footer';
      const st = window.getComputedStyle(getLayerRoot(el));
      if (st.position === 'fixed') return '5-floating';
      return '3-main';
    }

    const candidates = Array.from(document.querySelectorAll('a[href], button, [role="button"]')).filter(isElementRendered);
    for (const el of candidates) {
      const href = (el.getAttribute('href') || '').toLowerCase();
      const text = `${el.innerText || ''} ${el.getAttribute('aria-label') || ''} ${el.id || ''} ${el.className || ''}`.toLowerCase();
      const visibleLabel = `${el.innerText || ''} ${el.getAttribute('aria-label') || ''}`.trim();

      let kind = null;
      if (href.startsWith('tel:')) kind = 'phone';
      else if (href.startsWith('mailto:')) kind = 'email';
      else if (/(?<![\p{L}\p{N}])(livechat|intercom|zendesk|crisp|chatbot|чат|онлайн-чат)(?![\p{L}\p{N}])/iu.test(text)) kind = 'chat';
      else if (
        /(?<![\p{L}\p{N}])(help|support|faq|contact|kundenservice|hilfe|kontakt|помощь|поддержка|контакты|вопросы)(?![\p{L}\p{N}])/iu.test(visibleLabel) ||
        /\/(help|support|faq|contact|hilfe|kontakt)(\/|$|\?)/i.test(href)
      ) {
        kind = 'help-link';
      }

      if (kind && !seenTypes.has(`${kind}:${getLandmarkZone(el)}`)) {
        seenTypes.add(`${kind}:${getLandmarkZone(el)}`);
        mechanisms.push({
          kind,
          zone: getLandmarkZone(el),
          label: getSnippetText(el),
          selector: getReadableSelector(el)
        });
      }
    }

    mechanisms.sort((a, b) => a.zone.localeCompare(b.zone));
    return {
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      signature: mechanisms.map(m => `${m.kind}@${m.zone}`).join('|'),
      mechanisms
    };
  }

  function getVisualBeforeAfterSpec(iss) {
    const p = iss.params || {};
    switch (iss.code) {
      case 'FOCUS_RING_SUPPRESSED':
      case 'FOCUS_APPEARANCE_LOW':
        return {
          title: 'Отсутствует видимая рамка фокуса (Tab)',
          beforeCap: 'Контур 0px — курсор пропадает',
          afterCap: 'Четкий контур 3px #2563eb',
          kind: 'focus'
        };
      case 'TARGET_COLLISION':
      case 'TARGET_SPACING_PASS':
        return {
          title: `Мелкая зона клика (${p.w || 18}×${p.h || 18} px)`,
          beforeCap: `Высота ${p.h || 18}px — риск промаха`,
          afterCap: 'Безопасная зона ≥ 24×24 px',
          kind: 'target'
        };
      case 'FOCUS_OBSCURED_FULL':
      case 'FOCUS_OBSCURED_PARTIAL':
        return {
          title: 'Перекрытие элемента липкой шапкой',
          beforeCap: `Скрыт под шапкой (${p.blockerH || 96}px)`,
          afterCap: 'Отступ scroll-padding сверху',
          kind: 'sticky'
        };
      case 'TEXT_CONTRAST_LOW':
        return {
          title: `Низкий контраст текста (${p.ratio}:1 < ${p.required}:1)`,
          beforeCap: `Бледный ${p.fgHex} (${p.ratio}:1)`,
          afterCap: `Четкий ${p.fixedHex} (≥ ${p.required}:1)`,
          kind: 'contrast',
          fgHex: p.fgHex,
          bgHex: p.bgHex,
          fixedHex: p.fixedHex
        };
      case 'IMG_ALT_MISSING':
      case 'EMPTY_INTERACTIVE_NAME':
      case 'FORM_LABEL_MISSING':
        return {
          title: 'Элемент «немой» для скринридера',
          beforeCap: 'Нет подписи alt / aria-label',
          afterCap: 'Доступное имя озвучено ✓',
          kind: 'semantic'
        };
      default:
        return {
          title: iss.title,
          beforeCap: 'Текущее состояние с риском EAA',
          afterCap: 'Исправлено по EN 301 549 ✓',
          kind: 'generic'
        };
    }
  }

  function syncBadgeLabels(root) {
    if (!root) return;
    const isSim = Boolean(window.__wcag22SimActive);
    const activeIdx = typeof window.__wcag22ActiveIdx === "number" ? window.__wcag22ActiveIdx : -1;
    root.querySelectorAll(".box").forEach(box => {
      const idx = Number(box.dataset.idx);
      const isSelected = idx === activeIdx;
      box.classList.toggle("is-selected", isSelected);
      const badge = box.querySelector(".badge");
      if (!badge) return;
      const liveEl = window.__wcag22IssueElements?.[idx];
      const morphed = isSim && liveEl && liveEl.hasAttribute("data-wcag22-sim");
      if (isSelected) {
        badge.textContent = morphed ? badge.dataset.afterFull : badge.dataset.beforeFull;
      } else {
        badge.textContent = morphed ? badge.dataset.afterShort : badge.dataset.beforeShort;
      }
    });
  }

  function updateTetherLine() {
    const host = document.getElementById(HUD_ID);
    const root = host && host.shadowRoot && host.shadowRoot.getElementById("hud-root");
    if (!root) return;
    const line = root.querySelector("#wcag22-tether-path");
    const dot = root.querySelector("#wcag22-tether-dot");
    const card = root.querySelector("#wcag22-inspector-card");
    const idx = window.__wcag22ActiveIdx;
    const liveEl = (typeof idx === "number" && idx >= 0) ? window.__wcag22IssueElements?.[idx] : null;

    if (!line || !dot || !card || card.hidden || !liveEl || !liveEl.isConnected || !isElementRendered(liveEl)) {
      if (line) line.setAttribute("d", "");
      if (dot) dot.setAttribute("opacity", "0");
      return;
    }

    const er = liveEl.getBoundingClientRect();
    const cr = card.getBoundingClientRect();
    if (cr.width < 10 || er.bottom < 0 || er.top > window.innerHeight) {
      line.setAttribute("d", "");
      dot.setAttribute("opacity", "0");
      return;
    }

    const ex = er.left + er.width / 2;
    const ey = er.top + er.height / 2;
    const cx = ex < cr.left ? cr.left : (ex > cr.right ? cr.right : cr.left + cr.width / 2);
    const cy = ey < cr.top ? cr.top + 22 : (ey > cr.bottom ? cr.bottom - 14 : cr.top + cr.height / 2);

    const midX = (cx + ex) / 2;
    line.setAttribute("d", `M ${Math.round(cx)} ${Math.round(cy)} Q ${Math.round(midX)} ${Math.round(cy)}, ${Math.round(ex)} ${Math.round(ey)}`);
    dot.setAttribute("cx", String(Math.round(ex)));
    dot.setAttribute("cy", String(Math.round(ey)));
    dot.setAttribute("opacity", "1");
  }

  function placeInspectorSmartCorner(card, liveEl) {
    if (!card || card.hidden) return;
    const cardW = card.offsetWidth || 344;
    const cardH = card.offsetHeight || 265;
    const pad = 18;

    // Respect user-dragged coordinates if manually moved (clamped to current viewport)
    if (window.__wcag22UserCardPos) {
      const ux = Math.max(10, Math.min(window.innerWidth - cardW - 10, window.__wcag22UserCardPos.x));
      const uy = Math.max(10, Math.min(window.innerHeight - cardH - 72, window.__wcag22UserCardPos.y));
      card.style.left = `${Math.round(ux)}px`;
      card.style.top = `${Math.round(uy)}px`;
      card.style.right = "auto";
      updateTetherLine();
      return;
    }

    const r = (liveEl && liveEl.isConnected)
      ? getGlobalViewportRect(liveEl)
      : { left: 100, right: 220, top: 200, bottom: 240, width: 120, height: 40 };

    const elCenterX = r.left + r.width / 2;
    const elCenterY = r.top + r.height / 2;

    // Choose opposite horizontal side from the inspected element so we NEVER cover its column!
    const placeLeft = elCenterX > window.innerWidth * 0.52;
    const x = placeLeft ? pad : Math.max(pad, window.innerWidth - cardW - pad);

    // Choose top corner (below sticky header ~74px), or shift down if element is right in that corner
    let y = 74;
    const overlapsHoriz = !(x + cardW + 16 < r.left || x - 16 > r.right);
    if (overlapsHoriz && r.top < y + cardH + 20) {
      y = Math.min(window.innerHeight - cardH - 78, Math.max(74, r.bottom + 24));
      if (y + cardH > window.innerHeight - 78 && elCenterY > window.innerHeight * 0.45) {
        y = 74;
      }
    }

    card.style.left = `${Math.round(x)}px`;
    card.style.top = `${Math.round(Math.max(12, y))}px`;
    card.style.right = "auto";
    updateTetherLine();
  }

  function attachPointerDrag(panelEl, handleEl, onMoved) {
    if (!panelEl || !handleEl) return;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let origLeft = 0;
    let origTop = 0;

    handleEl.addEventListener("pointerdown", e => {
      if (e.target.closest("button")) return;
      dragging = true;
      const rect = panelEl.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      origLeft = rect.left;
      origTop = rect.top;
      panelEl.style.left = `${Math.round(origLeft)}px`;
      panelEl.style.top = `${Math.round(origTop)}px`;
      panelEl.style.right = "auto";
      panelEl.style.bottom = "auto";
      panelEl.style.transform = "none";
      try { handleEl.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });

    handleEl.addEventListener("pointermove", e => {
      if (!dragging) return;
      const w = panelEl.offsetWidth || 320;
      const h = panelEl.offsetHeight || 50;
      const nx = Math.max(6, Math.min(window.innerWidth - w - 6, origLeft + (e.clientX - startX)));
      const ny = Math.max(6, Math.min(window.innerHeight - h - 6, origTop + (e.clientY - startY)));
      panelEl.style.left = `${Math.round(nx)}px`;
      panelEl.style.top = `${Math.round(ny)}px`;
      if (onMoved) onMoved(nx, ny);
    });

    const stop = e => {
      if (!dragging) return;
      dragging = false;
      try { handleEl.releasePointerCapture(e.pointerId); } catch (_) {}
    };
    handleEl.addEventListener("pointerup", stop);
    handleEl.addEventListener("pointercancel", stop);
  }

  function syncHudBoxesToLiveDom() {
    const host = document.getElementById(HUD_ID);
    const root = host && host.shadowRoot && host.shadowRoot.getElementById("hud-root");
    if (!root || !window.__wcag22IssueElements) return;

    root.querySelectorAll(".box").forEach(box => {
      const idx = Number(box.dataset.idx);
      const liveEl = window.__wcag22IssueElements[idx];
      if (liveEl && liveEl.isConnected && isElementRendered(liveEl)) {
        const nr = liveEl.getBoundingClientRect();
        box.style.left = `${Math.max(0, nr.left + window.scrollX - 3)}px`;
        box.style.top = `${Math.max(0, nr.top + window.scrollY - 3)}px`;
        box.style.width = `${Math.max(18, nr.width + 6)}px`;
        box.style.height = `${Math.max(18, nr.height + 6)}px`;
        const badge = box.querySelector(".badge");
        if (badge) {
          badge.classList.toggle("badge-below", nr.top < 22);
        }
      }
    });
    syncBadgeLabels(root);
    updateTetherLine();
  }

  function setLiveFixSimulation(enabled) {
    clearLiveSimulationArtifacts();
    const host = document.getElementById(HUD_ID);
    const root = host && host.shadowRoot && host.shadowRoot.getElementById("hud-root");
    const audit = window.__wcag22LastAudit;

    if (!enabled || !audit) {
      if (root) {
        root.classList.remove("sim-fixed");
        const btnBefore = root.querySelector("#dock-btn-before");
        const btnAfter = root.querySelector("#dock-btn-after");
        if (btnBefore) btnBefore.classList.add("is-active");
        if (btnAfter) btnAfter.classList.remove("is-active");
        const cardSimBtn = root.querySelector("#insp-toggle-sim");
        if (cardSimBtn) {
          cardSimBtn.textContent = "✨ Применить «ПОСЛЕ» прямо на сайте";
          cardSimBtn.classList.remove("is-after");
        }
      }
      requestAnimationFrame(syncHudBoxesToLiveDom);
      setTimeout(syncHudBoxesToLiveDom, 120);
      return { ok: true, active: false };
    }

    let maxScrollPad = 96;
    const includeWarnings = Boolean(window.__wcag22ShowWarnings);
    const activeInspIdx = typeof window.__wcag22ActiveIdx === "number" ? window.__wcag22ActiveIdx : -1;

    audit.issues.forEach((iss, idx) => {
      const shouldMorph = iss.severity === "fail" || includeWarnings || idx === activeInspIdx;
      if (!shouldMorph) return;

      const liveEl = window.__wcag22IssueElements?.[idx];
      if (!liveEl || !liveEl.isConnected) return;

      if (iss.code === "FOCUS_RING_SUPPRESSED" || iss.code === "FOCUS_APPEARANCE_LOW") {
        liveEl.setAttribute("data-wcag22-sim", "focus");
      } else if (iss.code === "TARGET_COLLISION" || iss.code === "TARGET_SPACING_PASS") {
        liveEl.setAttribute("data-wcag22-sim", "target");
      } else if (iss.code === "FOCUS_OBSCURED_FULL" || iss.code === "FOCUS_OBSCURED_PARTIAL") {
        liveEl.setAttribute("data-wcag22-sim", "scroll");
        maxScrollPad = Math.max(maxScrollPad, (iss.params?.blockerH || 96) + 24);
      } else if (iss.code === "TEXT_CONTRAST_LOW" && iss.params?.fixedHex) {
        if (!liveEl.hasAttribute("data-wcag22-orig-color")) {
          liveEl.setAttribute("data-wcag22-orig-color", liveEl.style.color || "");
        }
        liveEl.style.setProperty("color", iss.params.fixedHex, "important");
        liveEl.setAttribute("data-wcag22-sim", "contrast");
      } else if (["IMG_ALT_MISSING", "EMPTY_INTERACTIVE_NAME", "FORM_LABEL_MISSING"].includes(iss.code)) {
        liveEl.setAttribute("data-wcag22-sim", "semantic");
      }
    });

    const styleEl = document.createElement("style");
    styleEl.id = SIM_STYLE_ID;
    styleEl.textContent = `
      html {
        scroll-padding-top: ${maxScrollPad}px !important;
      }
      [data-wcag22-sim="focus"] {
        outline: 3px solid #2563eb !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 5px rgba(37, 99, 235, 0.28) !important;
        border-radius: 4px !important;
        transition: outline 0.2s ease, box-shadow 0.2s ease !important;
      }
      [data-wcag22-sim="target"] {
        min-width: 24px !important;
        min-height: 24px !important;
        padding-top: 3px !important;
        padding-bottom: 3px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        background-color: rgba(16, 185, 129, 0.12) !important;
        border-radius: 4px !important;
        transition: background-color 0.18s ease !important;
      }
      [data-wcag22-sim="scroll"] {
        scroll-margin-top: ${maxScrollPad}px !important;
      }
      [data-wcag22-sim="semantic"] {
        outline: 2px dashed #10b981 !important;
        outline-offset: 2px !important;
      }
    `;
    document.head.appendChild(styleEl);
    window.__wcag22SimActive = true;

    if (root) {
      root.classList.add("sim-fixed");
      const btnBefore = root.querySelector("#dock-btn-before");
      const btnAfter = root.querySelector("#dock-btn-after");
      if (btnBefore) btnBefore.classList.remove("is-active");
      if (btnAfter) btnAfter.classList.add("is-active");
      const cardSimBtn = root.querySelector("#insp-toggle-sim");
      if (cardSimBtn) {
        cardSimBtn.textContent = "↩ Вернуть «ДО» (показать исходную ошибку)";
        cardSimBtn.classList.add("is-after");
      }
    }

    if (activeInspIdx >= 0) {
      const activeEl = window.__wcag22IssueElements?.[activeInspIdx];
      const activeIss = audit.issues[activeInspIdx];
      if (activeEl && activeEl.isConnected && activeIss?.criterion === "2.4.11") {
        activeEl.scrollIntoView({ block: "start", behavior: "smooth" });
      }
    }

    requestAnimationFrame(syncHudBoxesToLiveDom);
    setTimeout(syncHudBoxesToLiveDom, 160);
    return { ok: true, active: true };
  }

  function openInspectorForIndex(idx, shouldScroll = true) {
    const audit = window.__wcag22LastAudit;
    const host = document.getElementById(HUD_ID);
    const root = host && host.shadowRoot && host.shadowRoot.getElementById("hud-root");
    if (!audit || !root || !audit.issues[idx]) return;

    window.__wcag22ActiveIdx = idx;
    const iss = audit.issues[idx];
    const liveEl = window.__wcag22IssueElements?.[idx];

    if (shouldScroll) {
      if (liveEl && liveEl.isConnected) {
        const layer = getLayerRoot(liveEl);
        if (layer !== document.body) {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          liveEl.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
        }
      } else if (iss.bbox) {
        window.scrollTo({ top: Math.max(0, iss.bbox.y - window.innerHeight / 3), behavior: "smooth" });
      }
    }

    root.querySelectorAll(".box").forEach(b => b.classList.remove("pulse", "force-show", "is-selected"));
    const targetBox = root.querySelector(`.box[data-idx="${idx}"]`);
    if (targetBox) {
      targetBox.classList.add("force-show", "pulse", "is-selected");
      setTimeout(() => targetBox.classList.remove("pulse"), 1300);
    }
    syncBadgeLabels(root);

    const visIndices = getVisibleIssueIndices();
    const posInVis = visIndices.indexOf(idx);
    const stepLbl = root.querySelector("#dock-step-lbl");
    if (stepLbl) {
      stepLbl.textContent = `${posInVis >= 0 ? posInVis + 1 : idx + 1} / ${Math.max(1, visIndices.length)}`;
    }

    const card = root.querySelector("#wcag22-inspector-card");
    if (!card) return;

    const spec = getVisualBeforeAfterSpec(iss);
    const isUnlocked = idx === 0 || Boolean(window.__wcag22ProUnlocked);
    const isCollapsed = Boolean(window.__wcag22CardCollapsed);

    let beforeArt = "";
    let afterArt = "";
    if (spec.kind === "focus") {
      beforeArt = `<div class="mini-input mini-no-ring">Поиск...</div>`;
      afterArt = `<div class="mini-input mini-has-ring">Поиск...</div>`;
    } else if (spec.kind === "target") {
      beforeArt = `<div class="mini-ring-bad"><span class="mini-btn-tiny">Кнопка</span></div>`;
      afterArt = `<div class="mini-btn-good">Кнопка ≥ 24px</div>`;
    } else if (spec.kind === "sticky") {
      beforeArt = `<div class="mini-sticky-wrap"><div class="mini-sticky-bar">ШАПКА</div><div class="mini-hidden-link">Ссылка скрыта</div></div>`;
      afterArt = `<div class="mini-sticky-wrap"><div class="mini-sticky-bar">ШАПКА</div><div class="mini-clear-link">Ссылка видна ✓</div></div>`;
    } else if (spec.kind === "contrast") {
      beforeArt = `<div style="padding:4px 8px;border-radius:4px;background:${spec.bgHex || '#fff'};color:${spec.fgHex || '#94a3b8'};font-weight:700;font-size:12px;">Текст Aa</div>`;
      afterArt = `<div style="padding:4px 8px;border-radius:4px;background:${spec.bgHex || '#fff'};color:${spec.fixedHex || '#0f172a'};font-weight:700;font-size:12px;">Текст Aa ✓</div>`;
    } else {
      beforeArt = `<div class="mini-generic-bad">Дефект SC ${iss.criterion}</div>`;
      afterArt = `<div class="mini-generic-good">Норма EN 301 549 ✓</div>`;
    }

    card.classList.toggle("is-collapsed", isCollapsed);
    card.innerHTML = `
      <div class="insp-head" id="insp-drag-bar" title="Перетащите окно в любое удобное место">
        <div class="insp-drag-left">
          <span class="drag-grip">⠿</span>
          <span class="insp-pill sev-${iss.severity}">#${idx + 1} · SC ${iss.criterion}</span>
        </div>
        <div class="insp-ctrl-btns">
          ${window.__wcag22UserCardPos ? `<button type="button" class="insp-icon-btn" id="insp-auto-corner" title="Вернуть авто-размещение в свободном углу">⤢</button>` : ""}
          <button type="button" class="insp-icon-btn" id="insp-min-btn" title="Свернуть / Развернуть">${isCollapsed ? "▢" : "—"}</button>
          <button type="button" class="insp-icon-btn" id="insp-close-btn" title="Закрыть карточку">&times;</button>
        </div>
      </div>
      <div class="insp-body-wrap">
        <div class="insp-title">${spec.title}</div>
        <div class="insp-el-name">${iss.elementLabel ? `Элемент: «${iss.elementLabel}»` : iss.selector}</div>
        <div style="font-size:10.5px;color:#93c5fd;background:rgba(37,99,235,0.14);border:1px solid rgba(96,165,250,0.3);border-radius:5px;padding:3px 7px;margin-bottom:8px;">⚖ ${iss.enClause || getLawMeta(iss.criterion).enClause} · ${iss.eaaLaw || getLawMeta(iss.criterion).eaaLaw}</div>

        <div class="insp-compare">
          <div class="insp-col insp-col-before">
            <div class="insp-col-tag tag-b">🔴 ДО (Сейчас)</div>
            <div class="insp-stage">${beforeArt}</div>
            <div class="insp-cap">${spec.beforeCap}</div>
          </div>
          <div class="insp-col insp-col-after">
            <div class="insp-col-tag tag-a">🟢 ПОСЛЕ (Фикс)</div>
            <div class="insp-stage">${afterArt}</div>
            <div class="insp-cap">${spec.afterCap}</div>
          </div>
        </div>

        <button type="button" id="insp-toggle-sim" class="insp-sim-btn ${window.__wcag22SimActive ? "is-after" : ""}">
          ${window.__wcag22SimActive ? "↩ Вернуть «ДО» (показать исходную ошибку)" : "✨ Применить «ПОСЛЕ» прямо на сайте"}
        </button>

        ${isUnlocked
          ? `<div class="insp-code">${iss.fixCode}</div>`
          : `<button type="button" id="insp-unlock-cta" class="insp-unlock-btn">🔒 Открыть CSS-код и полный PDF-отчет ($10/мес) →</button>`
        }
      </div>
    `;

    card.hidden = false;

    attachPointerDrag(card, card.querySelector("#insp-drag-bar"), (nx, ny) => {
      window.__wcag22UserCardPos = { x: nx, y: ny };
      updateTetherLine();
    });

    setTimeout(() => placeInspectorSmartCorner(card, liveEl), 35);
    if (shouldScroll) {
      setTimeout(() => placeInspectorSmartCorner(card, liveEl), 260);
    }

    card.querySelector("#insp-auto-corner")?.addEventListener("click", () => {
      window.__wcag22UserCardPos = null;
      openInspectorForIndex(idx, false);
    });
    card.querySelector("#insp-min-btn")?.addEventListener("click", () => {
      window.__wcag22CardCollapsed = !window.__wcag22CardCollapsed;
      openInspectorForIndex(idx, false);
    });
    card.querySelector("#insp-close-btn")?.addEventListener("click", () => {
      card.hidden = true;
      updateTetherLine();
    });
    card.querySelector("#insp-toggle-sim")?.addEventListener("click", () => {
      setLiveFixSimulation(!window.__wcag22SimActive);
    });
    card.querySelector("#insp-unlock-cta")?.addEventListener("click", () => {
      if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ type: "OPEN_REPORT_FROM_PAGE", mode: "pdf", audit: window.__wcag22LastAudit });
      }
    });

    if (window.__wcag22SimActive) {
      setLiveFixSimulation(true);
    }
  }

  function getVisibleIssueIndices() {
    const audit = window.__wcag22LastAudit;
    if (!audit) return [];
    const showWarn = Boolean(window.__wcag22ShowWarnings);
    const out = [];
    audit.issues.forEach((iss, i) => {
      if (iss.severity === "fail" || showWarn) out.push(i);
    });
    return out;
  }

  function renderShadowHud(issues, tabStops, showWarnings = false, showTabMap = false, counts = {}) {
    let host = document.getElementById(HUD_ID);
    if (host) host.remove();

    host = document.createElement("div");
    host.id = HUD_ID;
    host.setAttribute("translate", "no");
    host.className = "notranslate";
    host.style.cssText = "position:absolute;top:0;left:0;width:0;height:0;z-index:2147483646;pointer-events:none;";
    const shadow = host.attachShadow({ mode: "open" });

    const wrapper = document.createElement("div");
    wrapper.id = "hud-root";
    if (!showWarnings) wrapper.classList.add("fails-only");
    if (!showTabMap) wrapper.classList.add("hide-tabmap");

    const style = document.createElement("style");
    style.textContent = `
      * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .box {
        position: absolute;
        pointer-events: none;
        border-radius: 5px;
        transition: left 0.2s ease, top 0.2s ease, width 0.2s ease, height 0.2s ease, box-shadow 0.2s ease;
      }
      .fails-only .box-warning,
      .fails-only .box-manual {
        display: none;
      }
      .hide-tabmap .tabmap-layer {
        display: none;
      }
      .box.force-show {
        display: block !important;
      }
      .box-fail {
        border: 2px solid #ef4444;
        background: rgba(239, 68, 68, 0.10);
      }
      .box.is-selected {
        z-index: 20;
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.55) !important;
      }
      .box-obscured {
        background: repeating-linear-gradient(
          -45deg,
          rgba(239, 68, 68, 0.24) 0px,
          rgba(239, 68, 68, 0.24) 6px,
          rgba(239, 68, 68, 0.06) 6px,
          rgba(239, 68, 68, 0.06) 12px
        );
      }
      .box-warning { border: 1.5px dashed #f59e0b; background: rgba(245, 158, 11, 0.06); }
      .box-manual { border: 1.5px dotted #3b82f6; background: rgba(59, 130, 246, 0.08); }

      .target-ring-24 {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 24px;
        height: 24px;
        margin-left: -12px;
        margin-top: -12px;
        border-radius: 999px;
        border: 1px dashed rgba(239, 68, 68, 0.75);
        background: rgba(239, 68, 68, 0.09);
      }

      /* Compact Micro-Pins so neighboring links in dense footers (like reebok.com) NEVER get covered! */
      .badge {
        position: absolute;
        top: -11px;
        left: -6px;
        pointer-events: auto;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        font-weight: 800;
        font-size: 9.5px;
        line-height: 13px;
        color: #ffffff;
        padding: 1px 5px;
        border-radius: 999px;
        white-space: nowrap;
        box-shadow: 0 2px 5px rgba(15, 23, 42, 0.35);
        z-index: 5;
        transition: transform 0.14s ease, background 0.18s ease;
      }
      .box.is-selected .badge,
      .badge:hover {
        z-index: 30;
        font-size: 10.5px;
        padding: 2px 8px;
        top: -21px;
        transform: scale(1.04);
      }
      .badge.badge-below { top: auto; bottom: -14px; }
      .box.is-selected .badge.badge-below { bottom: -22px; }

      .box-fail .badge { background: #dc2626; }
      .box-warning .badge { background: #d97706; }
      .box-manual .badge { background: #2563eb; }

      /* Live Fix Simulation State ("ПОСЛЕ") */
      #hud-root.sim-fixed .box-fail,
      #hud-root.sim-fixed .box-warning {
        border: 2px solid #10b981 !important;
        background: rgba(16, 185, 129, 0.08) !important;
      }
      #hud-root.sim-fixed .box-fail .badge,
      #hud-root.sim-fixed .box-warning .badge {
        background: #059669 !important;
      }
      #hud-root.sim-fixed .target-ring-24 {
        border-color: rgba(16, 185, 129, 0.65) !important;
        background: rgba(16, 185, 129, 0.08) !important;
      }

      .pulse {
        transform: scale(1.04);
        box-shadow: 0 0 0 7px rgba(59, 130, 246, 0.5) !important;
      }

      .tether-svg {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 2147483646;
      }

      /* Draggable Floating Studio Dock */
      .auditor-dock {
        position: fixed;
        bottom: 14px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483647;
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.94);
        backdrop-filter: blur(10px);
        border: 1.5px solid #334155;
        box-shadow: 0 14px 36px rgba(0, 0, 0, 0.48);
        color: #f8fafc;
        width: max-content;
        max-width: calc(100vw - 20px);
        flex-wrap: wrap;
        justify-content: center;
      }
      .dock-grip {
        cursor: grab;
        color: #64748b;
        font-size: 13px;
        padding: 2px 4px;
        user-select: none;
        touch-action: none;
      }
      .dock-grip:active { cursor: grabbing; }
      .dock-score {
        font-size: 11px;
        font-weight: 800;
        padding: 4px 8px;
        border-radius: 999px;
        background: #1e293b;
        color: #cbd5e1;
        white-space: nowrap;
      }
      .dock-seg {
        display: inline-flex;
        background: #0b1120;
        border: 1px solid #334155;
        border-radius: 999px;
        padding: 2px;
      }
      .seg-btn {
        border: none;
        background: transparent;
        color: #94a3b8;
        font-size: 11px;
        font-weight: 700;
        padding: 5px 10px;
        border-radius: 999px;
        cursor: pointer;
        white-space: nowrap;
      }
      .seg-btn.seg-before.is-active { background: #dc2626; color: #ffffff; }
      .seg-btn.seg-after.is-active { background: #10b981; color: #052e16; }

      .dock-stepper {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 999px;
        padding: 2px 5px;
      }
      .step-arrow {
        border: none;
        background: transparent;
        color: #f8fafc;
        font-size: 11px;
        font-weight: 700;
        padding: 3px 6px;
        cursor: pointer;
        border-radius: 999px;
      }
      .step-arrow:hover { background: #334155; }
      #dock-step-lbl { font-size: 11px; font-weight: 700; color: #cbd5e1; min-width: 38px; text-align: center; }

      .dock-chip {
        border: 1px solid #475569;
        background: #1e293b;
        color: #cbd5e1;
        font-size: 11px;
        font-weight: 700;
        padding: 5px 9px;
        border-radius: 999px;
        cursor: pointer;
        white-space: nowrap;
      }
      .dock-chip.is-on { border-color: #f59e0b; background: rgba(245, 158, 11, 0.18); color: #fde68a; }
      .dock-chip-tab.is-on { border-color: #8b5cf6; background: rgba(139, 92, 246, 0.22); color: #ddd6fe; }
      .dock-report-btn {
        border: none;
        background: #3b82f6;
        color: #ffffff;
        font-size: 11px;
        font-weight: 700;
        padding: 6px 11px;
        border-radius: 999px;
        cursor: pointer;
        white-space: nowrap;
      }
      .dock-report-btn:hover { background: #2563eb; }
      .dock-close {
        border: none;
        background: transparent;
        color: #94a3b8;
        font-size: 16px;
        line-height: 1;
        padding: 2px 5px;
        cursor: pointer;
      }

      /* Smart Corner Auto-Evade + Freely Draggable Inspector Card */
      .inspector-card[hidden] { display: none !important; }
      .inspector-card {
        position: fixed;
        z-index: 2147483647;
        pointer-events: auto;
        width: 344px;
        background: rgba(15, 23, 42, 0.96);
        backdrop-filter: blur(12px);
        color: #f8fafc;
        border: 1.5px solid #475569;
        border-radius: 14px;
        padding: 10px 13px 12px;
        box-shadow: 0 20px 48px rgba(0, 0, 0, 0.52);
      }
      .inspector-card.is-collapsed .insp-body-wrap {
        display: none;
      }
      .inspector-card.is-collapsed {
        padding-bottom: 10px;
      }
      .insp-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: grab;
        user-select: none;
        touch-action: none;
        padding-bottom: 6px;
        margin-bottom: 6px;
        border-bottom: 1px solid rgba(71, 85, 105, 0.5);
      }
      .inspector-card.is-collapsed .insp-head {
        padding-bottom: 0;
        margin-bottom: 0;
        border-bottom: none;
      }
      .insp-head:active { cursor: grabbing; }
      .insp-drag-left {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .drag-grip {
        color: #94a3b8;
        font-size: 14px;
        line-height: 1;
      }
      .insp-ctrl-btns {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .insp-icon-btn {
        border: 1px solid #334155;
        background: #1e293b;
        color: #cbd5e1;
        width: 22px;
        height: 22px;
        border-radius: 6px;
        font-size: 12px;
        line-height: 1;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .insp-icon-btn:hover { background: #334155; color: #ffffff; }
      .insp-pill {
        font-size: 10.5px;
        font-weight: 800;
        padding: 2px 8px;
        border-radius: 999px;
      }
      .insp-pill.sev-fail { background: rgba(239, 68, 68, 0.22); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.45); }
      .insp-pill.sev-warning, .insp-pill.sev-manual { background: rgba(245, 158, 11, 0.22); color: #fde68a; border: 1px solid rgba(245, 158, 11, 0.45); }

      .insp-title { font-size: 12.5px; font-weight: 700; color: #ffffff; margin-bottom: 3px; }
      .insp-el-name {
        font-size: 11px;
        color: #93c5fd;
        margin-bottom: 8px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .insp-compare {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-bottom: 8px;
      }
      .insp-col { border-radius: 9px; padding: 7px; text-align: center; }
      .insp-col-before { background: rgba(239, 68, 68, 0.09); border: 1px solid rgba(239, 68, 68, 0.35); }
      .insp-col-after { background: rgba(16, 185, 129, 0.09); border: 1px solid rgba(16, 185, 129, 0.35); }
      .insp-col-tag { font-size: 10px; font-weight: 800; margin-bottom: 5px; }
      .tag-b { color: #fca5a5; }
      .tag-a { color: #6ee7b7; }
      .insp-stage { height: 42px; display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }
      .insp-cap { font-size: 10px; color: #cbd5e1; line-height: 1.25; }

      .mini-input { background: #ffffff; color: #334155; font-size: 10px; padding: 4px 10px; border-radius: 4px; border: 1px solid #cbd5e1; }
      .mini-has-ring { outline: 2.5px solid #2563eb; outline-offset: 2px; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.3); }
      .mini-ring-bad { width: 28px; height: 28px; border-radius: 999px; border: 1.5px dashed #ef4444; background: rgba(239, 68, 68, 0.2); display: flex; align-items: center; justify-content: center; }
      .mini-btn-tiny { font-size: 8.5px; background: #334155; color: #fff; padding: 1px 4px; line-height: 11px; border-radius: 2px; }
      .mini-btn-good { font-size: 10px; font-weight: 700; background: rgba(16, 185, 129, 0.25); border: 1.5px dashed #10b981; color: #ecfdf5; padding: 5px 10px; border-radius: 5px; }
      .mini-sticky-wrap { width: 100%; font-size: 9px; }
      .mini-sticky-bar { background: #475569; color: #fff; padding: 2px 4px; border-radius: 3px; font-weight: 700; }
      .mini-hidden-link { background: rgba(239,68,68,0.3); color: #fecaca; margin-top: -4px; padding: 2px 4px; border-radius: 3px; }
      .mini-clear-link { background: rgba(16,185,129,0.25); color: #a7f3d0; margin-top: 4px; padding: 2px 4px; border-radius: 3px; }
      .mini-generic-bad { font-size: 10px; color: #fca5a5; font-weight: 700; }
      .mini-generic-good { font-size: 10px; color: #6ee7b7; font-weight: 700; }

      .insp-sim-btn {
        width: 100%;
        border: 1px solid #10b981;
        background: rgba(16, 185, 129, 0.18);
        color: #a7f3d0;
        font-weight: 700;
        font-size: 11.5px;
        padding: 7px 10px;
        border-radius: 8px;
        cursor: pointer;
        margin-bottom: 7px;
      }
      .insp-sim-btn.is-after { background: #059669; color: #ffffff; }
      .insp-code {
        background: #0b1120;
        border: 1px solid #334155;
        color: #a7f3d0;
        font: 600 10.5px/1.35 ui-monospace, monospace;
        padding: 6px 8px;
        border-radius: 6px;
        overflow-wrap: anywhere;
      }
      .insp-unlock-btn {
        width: 100%;
        border: 1px solid rgba(59, 130, 246, 0.55);
        background: rgba(59, 130, 246, 0.18);
        color: #bfdbfe;
        font-weight: 700;
        font-size: 11px;
        padding: 7px 9px;
        border-radius: 8px;
        cursor: pointer;
      }
      .insp-unlock-btn:hover { background: #2563eb; color: #ffffff; }

      .tabmap-svg { position: absolute; top: 0; left: 0; overflow: visible; pointer-events: none; }
      .tab-stop-dot {
        position: absolute;
        width: 19px;
        height: 19px;
        margin-left: -9.5px;
        margin-top: -9.5px;
        border-radius: 999px;
        background: #7c3aed;
        border: 2px solid #ffffff;
        color: #ffffff;
        font: 700 9.5px/15px ui-monospace, monospace;
        text-align: center;
        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.45);
      }
    `;
    shadow.appendChild(style);

    issues.forEach((issue, idx) => {
      if (!issue.bbox) return;
      const box = document.createElement("div");
      const extraCls = issue.code === "FOCUS_OBSCURED_FULL" ? " box-obscured" : "";
      box.className = `box box-${issue.severity}${extraCls}`;
      box.dataset.idx = String(idx);
      box.style.left = `${Math.max(0, issue.bbox.x - 3)}px`;
      box.style.top = `${Math.max(0, issue.bbox.y - 3)}px`;
      box.style.width = `${Math.max(18, issue.bbox.w + 6)}px`;
      box.style.height = `${Math.max(18, issue.bbox.h + 6)}px`;

      if (issue.criterion === "2.5.8") {
        const ring = document.createElement("span");
        ring.className = "target-ring-24";
        box.appendChild(ring);
      }

      const badge = document.createElement("span");
      badge.className = issue.bbox.y < 22 ? "badge badge-below" : "badge";
      const beforeShort = `#${idx + 1}`;
      const afterShort = `✓${idx + 1}`;
      const beforeFull = `#${idx + 1} · ${issue.hudCallout || `SC ${issue.criterion}`}`;
      const afterFull = `#${idx + 1} ✓ ИСПРАВЛЕНО (SC ${issue.criterion})`;

      badge.dataset.beforeShort = beforeShort;
      badge.dataset.afterShort = afterShort;
      badge.dataset.beforeFull = beforeFull;
      badge.dataset.afterFull = afterFull;
      badge.textContent = beforeShort;
      badge.title = `${beforeFull} — нажмите для сравнения ДО / ПОСЛЕ`;

      badge.addEventListener("mouseenter", () => {
        const morphed = window.__wcag22SimActive && window.__wcag22IssueElements?.[idx]?.hasAttribute("data-wcag22-sim");
        badge.textContent = morphed ? afterFull : beforeFull;
      });
      badge.addEventListener("mouseleave", () => {
        if (window.__wcag22ActiveIdx !== idx) {
          const morphed = window.__wcag22SimActive && window.__wcag22IssueElements?.[idx]?.hasAttribute("data-wcag22-sim");
          badge.textContent = morphed ? afterShort : beforeShort;
        }
      });
      badge.addEventListener("click", e => {
        e.stopPropagation();
        openInspectorForIndex(idx, false);
      });
      box.appendChild(badge);
      wrapper.appendChild(box);
    });

    // Subtle SVG tether connector linking docked/dragged Inspector Card to active element!
    const svgNS = "http://www.w3.org/2000/svg";
    const tetherSvg = document.createElementNS(svgNS, "svg");
    tetherSvg.setAttribute("class", "tether-svg");
    const tetherPath = document.createElementNS(svgNS, "path");
    tetherPath.setAttribute("id", "wcag22-tether-path");
    tetherPath.setAttribute("fill", "none");
    tetherPath.setAttribute("stroke", "rgba(96, 165, 250, 0.78)");
    tetherPath.setAttribute("stroke-width", "2");
    tetherPath.setAttribute("stroke-dasharray", "5 4");
    const tetherDot = document.createElementNS(svgNS, "circle");
    tetherDot.setAttribute("id", "wcag22-tether-dot");
    tetherDot.setAttribute("r", "4.5");
    tetherDot.setAttribute("fill", "#3b82f6");
    tetherDot.setAttribute("stroke", "#ffffff");
    tetherDot.setAttribute("stroke-width", "1.5");
    tetherDot.setAttribute("opacity", "0");
    tetherSvg.append(tetherPath, tetherDot);
    wrapper.appendChild(tetherSvg);

    if (Array.isArray(tabStops) && tabStops.length > 0) {
      const tabLayer = document.createElement("div");
      tabLayer.className = "tabmap-layer";

      const docW = Math.max(document.documentElement.scrollWidth, window.innerWidth);
      const docH = Math.max(document.documentElement.scrollHeight, window.innerHeight);
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("class", "tabmap-svg");
      svg.setAttribute("width", String(docW));
      svg.setAttribute("height", String(docH));

      if (tabStops.length > 1) {
        const poly = document.createElementNS(svgNS, "polyline");
        poly.setAttribute("points", tabStops.map(s => `${s.x},${s.y}`).join(" "));
        poly.setAttribute("fill", "none");
        poly.setAttribute("stroke", "rgba(124, 58, 237, 0.72)");
        poly.setAttribute("stroke-width", "2");
        poly.setAttribute("stroke-dasharray", "4 3");
        svg.appendChild(poly);
      }
      tabLayer.appendChild(svg);

      tabStops.slice(0, 99).forEach(s => {
        const dot = document.createElement("div");
        dot.className = "tab-stop-dot";
        dot.style.left = `${s.x}px`;
        dot.style.top = `${s.y}px`;
        dot.textContent = String(s.order);
        tabLayer.appendChild(dot);
      });

      wrapper.appendChild(tabLayer);
    }

    const inspCard = document.createElement("div");
    inspCard.id = "wcag22-inspector-card";
    inspCard.className = "inspector-card";
    inspCard.hidden = true;
    wrapper.appendChild(inspCard);

    const dock = document.createElement("div");
    dock.id = "wcag22-auditor-dock";
    dock.className = "auditor-dock";

    const initVisCount = showWarnings ? issues.length : issues.filter(i => i.severity === "fail").length;
    dock.innerHTML = `
      <span class="dock-grip" id="dock-drag-grip" title="Перетащить панель">⠿</span>
      <span class="dock-score">EAA ${counts.score ?? 100}% · 🔴 ${counts.fail ?? 0}</span>
      <div class="dock-seg" role="group" aria-label="Before and After Simulation">
        <button type="button" id="dock-btn-before" class="seg-btn seg-before is-active">🔴 ДО (Ошибки)</button>
        <button type="button" id="dock-btn-after" class="seg-btn seg-after">🟢 ПОСЛЕ (Как исправить)</button>
      </div>
      <div class="dock-stepper">
        <button type="button" id="dock-prev" class="step-arrow" title="Предыдущий элемент">◀</button>
        <span id="dock-step-lbl">${initVisCount > 0 ? `1 / ${initVisCount}` : "0 / 0"}</span>
        <button type="button" id="dock-next" class="step-arrow" title="Следующий элемент">▶</button>
      </div>
      <button type="button" id="dock-warn-chip" class="dock-chip ${showWarnings ? "is-on" : ""}">+Риски (${counts.warning ?? 0})</button>
      <button type="button" id="dock-tab-chip" class="dock-chip dock-chip-tab ${showTabMap ? "is-on" : ""}">Tab#</button>
      <button type="button" id="dock-open-report" class="dock-report-btn">📄 Отчет / PDF</button>
      <button type="button" id="dock-close-hud" class="dock-close" title="Скрыть панель">&times;</button>
    `;
    wrapper.appendChild(dock);

    shadow.appendChild(wrapper);
    document.documentElement.appendChild(host);

    attachPointerDrag(dock, dock.querySelector("#dock-drag-grip"));

    dock.querySelector("#dock-btn-before")?.addEventListener("click", () => {
      setLiveFixSimulation(false);
    });
    dock.querySelector("#dock-btn-after")?.addEventListener("click", () => {
      if ((counts.fail || 0) === 0 && (counts.warning || 0) > 0 && !window.__wcag22ShowWarnings) {
        window.__wcag22ShowWarnings = true;
        wrapper.classList.remove("fails-only");
        dock.querySelector("#dock-warn-chip")?.classList.add("is-on");
      }
      setLiveFixSimulation(true);
      const vis = getVisibleIssueIndices();
      if (vis.length > 0 && (typeof window.__wcag22ActiveIdx !== "number" || window.__wcag22ActiveIdx < 0)) {
        openInspectorForIndex(vis[0], false);
      }
    });

    dock.querySelector("#dock-prev")?.addEventListener("click", () => {
      const vis = getVisibleIssueIndices();
      if (!vis.length) return;
      const curPos = vis.indexOf(window.__wcag22ActiveIdx ?? vis[0]);
      const nextPos = (curPos - 1 + vis.length) % vis.length;
      openInspectorForIndex(vis[nextPos], true);
    });
    dock.querySelector("#dock-next")?.addEventListener("click", () => {
      const vis = getVisibleIssueIndices();
      if (!vis.length) return;
      const curPos = vis.indexOf(window.__wcag22ActiveIdx ?? -1);
      const nextPos = (curPos + 1) % vis.length;
      openInspectorForIndex(vis[nextPos], true);
    });

    dock.querySelector("#dock-warn-chip")?.addEventListener("click", e => {
      window.__wcag22ShowWarnings = !window.__wcag22ShowWarnings;
      wrapper.classList.toggle("fails-only", !window.__wcag22ShowWarnings);
      e.currentTarget.classList.toggle("is-on", window.__wcag22ShowWarnings);
      const vis = getVisibleIssueIndices();
      const stepLbl = dock.querySelector("#dock-step-lbl");
      if (stepLbl) stepLbl.textContent = vis.length ? `1 / ${vis.length}` : "0 / 0";
      if (window.__wcag22SimActive) setLiveFixSimulation(true);
    });

    dock.querySelector("#dock-tab-chip")?.addEventListener("click", e => {
      window.__wcag22ShowTabMap = !window.__wcag22ShowTabMap;
      wrapper.classList.toggle("hide-tabmap", !window.__wcag22ShowTabMap);
      e.currentTarget.classList.toggle("is-on", window.__wcag22ShowTabMap);
    });

    function renderInPageSpotlightCrop(dataUrl, rect, issue, badgeNum) {
      return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
          const dpr = rect.dpr || 1;
          const ctxW = Math.max(440, rect.w + 180);
          const ctxH = Math.max(230, rect.h + 130);
          const centerX = rect.x + rect.w / 2;
          const centerY = rect.y + rect.h / 2;
          const maxCssW = img.width / dpr;
          const maxCssH = img.height / dpr;
          const cropCssX = Math.max(0, Math.min(maxCssW - ctxW, centerX - ctxW / 2));
          const cropCssY = Math.max(0, Math.min(maxCssH - ctxH, centerY - ctxH / 2));
          const actualCssW = Math.max(80, Math.min(maxCssW - cropCssX, ctxW));
          const actualCssH = Math.max(60, Math.min(maxCssH - cropCssY, ctxH));
          const outW = 640;
          const scale = outW / actualCssW;
          const outH = Math.round(actualCssH * scale);
          const canvas = document.createElement("canvas");
          canvas.width = outW;
          canvas.height = outH;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, Math.round(cropCssX * dpr), Math.round(cropCssY * dpr), Math.round(actualCssW * dpr), Math.round(actualCssH * dpr), 0, 0, outW, outH);
          const ex = (rect.x - cropCssX) * scale;
          const ey = (rect.y - cropCssY) * scale;
          const ew = Math.max(16, rect.w * scale);
          const eh = Math.max(16, rect.h * scale);
          ctx.save();
          ctx.fillStyle = "rgba(15, 23, 42, 0.34)";
          ctx.beginPath();
          ctx.rect(0, 0, outW, outH);
          ctx.rect(Math.max(0, ex - 10), Math.max(0, ey - 10), Math.min(outW, ew + 20), Math.min(outH, eh + 20));
          ctx.fill("evenodd");
          ctx.restore();
          if (issue.criterion === "2.5.8") {
            const r24 = 12 * scale;
            ctx.save();
            ctx.beginPath();
            ctx.arc(ex + ew / 2, ey + eh / 2, r24, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(239, 68, 68, 0.22)";
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 4]);
            ctx.strokeStyle = "#ef4444";
            ctx.stroke();
            ctx.restore();
          }
          ctx.save();
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 3;
          ctx.shadowColor = "rgba(239, 68, 68, 0.65)";
          ctx.shadowBlur = 10;
          ctx.strokeRect(ex - 4, ey - 4, ew + 8, eh + 8);
          ctx.restore();
          const pillText = `#${badgeNum} · SC ${issue.criterion} · ${issue.hudCallout || "VIOLATION"}`;
          ctx.save();
          ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          const pw = ctx.measureText(pillText).width + 20;
          const ph = 26;
          const px = Math.max(8, Math.min(outW - pw - 8, ex - 4));
          const py = (ey - ph - 10 >= 6) ? (ey - ph - 10) : Math.min(outH - ph - 6, ey + eh + 10);
          ctx.fillStyle = "#dc2626";
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(px, py, pw, ph, 6);
          else ctx.rect(px, py, pw, ph);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.textBaseline = "middle";
          ctx.fillText(pillText, px + 10, py + ph / 2 + 0.5);
          ctx.restore();
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = () => resolve(null);
        img.src = dataUrl;
      });
    }

    function waitForScrollAndStickyHeaderSettle(ms = 350) {
      return new Promise(resolve => {
        setTimeout(() => {
          if (typeof requestAnimationFrame === "function") {
            requestAnimationFrame(() => requestAnimationFrame(resolve));
          } else {
            resolve();
          }
        }, ms);
      });
    }

    async function captureAuditCropsFromDock(rawAudit) {
      if (!rawAudit || !Array.isArray(rawAudit.issues)) return rawAudit;
      const enriched = JSON.parse(JSON.stringify(rawAudit));
      const wasSim = Boolean(window.__wcag22SimActive);
      if (wasSim) clearLiveSimulationArtifacts();
      const prevScrollX = window.scrollX;
      const prevScrollY = window.scrollY;
      host.style.display = "none";

      const seenGroups = new Set();
      const targets = [];
      let gOrder = 0;
      enriched.issues.forEach((iss, idx) => {
        if (iss.severity !== "fail" || !iss.bbox || iss.code === "HTML_LANG_MISSING") return;
        const gk = `${iss.criterion}|${iss.code || ''}|${iss.componentGroupKey || iss.selector}`;
        if (seenGroups.has(gk)) return;
        seenGroups.add(gk);
        gOrder += 1;
        if (targets.length < 10) targets.push({ iss, idx, badgeNum: gOrder });
      });

      for (const { iss, idx, badgeNum } of targets) {
        try {
          const liveEl = window.__wcag22IssueElements?.[idx];
          if (liveEl && liveEl.isConnected) {
            const layer = getLayerRoot(liveEl);
            if (layer !== document.body || iss.bbox.y < window.innerHeight * 0.42) {
              window.scrollTo(0, 0);
            } else {
              liveEl.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
            }
          }
          await waitForScrollAndStickyHeaderSettle(350);
          const rNow = (liveEl && liveEl.isConnected)
            ? getGlobalViewportRect(liveEl)
            : { left: iss.bbox.x - window.scrollX, top: iss.bbox.y - window.scrollY, width: iss.bbox.w, height: iss.bbox.h };
          const shot = await new Promise(res => chrome.runtime.sendMessage({ type: "CAPTURE_VISIBLE_TAB" }, res));
          if (shot && shot.dataUrl) {
            iss.cropDataUrl = await renderInPageSpotlightCrop(shot.dataUrl, {
              x: rNow.left, y: rNow.top, w: rNow.width, h: rNow.height, dpr: window.devicePixelRatio || 1
            }, iss, badgeNum);
          }
        } catch (_) {}
      }

      window.scrollTo(prevScrollX, prevScrollY);
      host.style.display = "block";
      if (wasSim) setLiveFixSimulation(true);
      return enriched;
    }

    dock.querySelector("#dock-open-report")?.addEventListener("click", async e => {
      if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) return;
      const btn = e.currentTarget;
      const origTxt = btn.textContent;
      btn.disabled = true;
      btn.textContent = "⏳ Снимки...";
      try {
        const enriched = await captureAuditCropsFromDock(window.__wcag22LastAudit);
        window.__wcag22LastAudit = enriched;
        chrome.runtime.sendMessage({ type: "OPEN_REPORT_FROM_PAGE", mode: "pdf", audit: enriched });
      } finally {
        btn.disabled = false;
        btn.textContent = origTxt;
      }
    });

    dock.querySelector("#dock-close-hud")?.addEventListener("click", () => {
      clearLiveSimulationArtifacts();
      host.style.display = "none";
    });
  }

  if (!window.__wcag22ScrollTetherInstalled) {
    window.__wcag22ScrollTetherInstalled = true;
    window.addEventListener("scroll", () => requestAnimationFrame(updateTetherLine), { passive: true });
    window.addEventListener("resize", () => requestAnimationFrame(updateTetherLine), { passive: true });
  }

  function computeReadinessScore(failCount, warnCount, checkedNodes) {
    if (checkedNodes <= 0) return 100;
    const penalty = failCount * 12 + Math.min(24, warnCount * 1.5);
    return Math.max(5, Math.min(100, Math.round(100 - penalty)));
  }

  function refreshProCacheFlag() {
    try {
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        chrome.storage.local.get(["monetize_paid_verified"], res => {
          window.__wcag22ProUnlocked = Boolean(res?.monetize_paid_verified);
        });
      }
    } catch (_) {}
  }

  function runFullAudit() {
    clearLiveSimulationArtifacts();
    window.__wcag22ActiveIdx = -1;
    refreshProCacheFlag();

    const startedAt = performance.now();
    const rBase = auditFoundationalWcag21();
    const r258 = auditTargetSize258();
    const rFocus = auditFocusAndTabOrder();
    const rAuth = auditAccessibleAuthAndRedundantEntry();
    const r257 = auditDraggingCandidates257();
    const overlayIssues = auditAccessibilityOverlays();
    const helpProfile = extractConsistentHelpMechanisms();

    const order = { fail: 0, warning: 1, manual: 2 };
    const sortedWithRefs = [
      ...rBase.issues,
      ...r258.issues,
      ...rFocus.issues,
      ...rAuth.issues,
      ...r257.issues,
      ...overlayIssues
    ].map(item => {
      const law = getLawMeta(item.criterion);
      return {
        ...item,
        enClause: law.enClause,
        eaaLaw: law.eaaLaw
      };
    }).sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));

    window.__wcag22IssueElements = sortedWithRefs.map(item => item._el || null);
    const allIssues = sortedWithRefs.map(({ _el, ...serializable }) => serializable);

    const failCount = allIssues.filter(i => i.severity === "fail").length;
    const warnCount = allIssues.filter(i => i.severity === "warning").length;
    const manualCount = allIssues.filter(i => i.severity === "manual").length;
    const checkedNodes = rBase.checkedCount + r258.checkedCount + rFocus.checkedCount;
    const readinessScore = computeReadinessScore(failCount, warnCount, checkedNodes);

    const result = {
      auditorVersion: "1.1.2",
      normativeVersion: globalThis.WCAG22_NORMATIVE_DB?.data?.registryVersion || "2026.11.1",
      url: window.location.href,
      pageTitle: document.title || window.location.hostname,
      scannedAt: new Date().toISOString(),
      durationMs: Math.round(performance.now() - startedAt),
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      readinessScore,
      counts: {
        fail: failCount,
        warning: warnCount,
        manual: manualCount,
        tabStops: rFocus.tabStops.length,
        checkedNodes
      },
      helpProfile,
      tabStops: rFocus.tabStops.slice(0, 60),
      issues: allIssues
    };

    window.__wcag22LastAudit = result;

    renderShadowHud(
      allIssues,
      rFocus.tabStops,
      Boolean(window.__wcag22ShowWarnings),
      Boolean(window.__wcag22ShowTabMap),
      { fail: failCount, warning: warnCount, score: readinessScore }
    );

    if (failCount > 0) {
      openInspectorForIndex(0, false);
    }

    return result;
  }

  if (!window.__wcag22ListenerInstalled) {
    window.__wcag22ListenerInstalled = true;
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (!msg || !msg.type) return false;
        const host = document.getElementById(HUD_ID);
        const root = host && host.shadowRoot && host.shadowRoot.getElementById("hud-root");

        if (msg.type === "HIGHLIGHT_ISSUE") {
          if (host) host.style.display = "block";
          openInspectorForIndex(msg.index, true);
          sendResponse({ ok: true });
        } else if (msg.type === "SIMULATE_FIXES") {
          if (host) host.style.display = "block";
          sendResponse(setLiveFixSimulation(Boolean(msg.enabled)));
        } else if (msg.type === "TOGGLE_HUD") {
          if (!msg.visible) clearLiveSimulationArtifacts();
          if (host) host.style.display = msg.visible ? "block" : "none";
          sendResponse({ ok: true });
        } else if (msg.type === "SET_HUD_WARNINGS") {
          window.__wcag22ShowWarnings = Boolean(msg.showWarnings);
          if (root) {
            root.classList.toggle("fails-only", !window.__wcag22ShowWarnings);
            root.querySelector("#dock-warn-chip")?.classList.toggle("is-on", window.__wcag22ShowWarnings);
          }
          if (window.__wcag22SimActive) setLiveFixSimulation(true);
          sendResponse({ ok: true });
        } else if (msg.type === "SET_HUD_TABMAP") {
          window.__wcag22ShowTabMap = Boolean(msg.showTabMap);
          if (root) {
            root.classList.toggle("hide-tabmap", !window.__wcag22ShowTabMap);
            root.querySelector("#dock-tab-chip")?.classList.toggle("is-on", window.__wcag22ShowTabMap);
          }
          sendResponse({ ok: true });
        } else if (msg.type === "SCROLL_FOR_CROP") {
          clearLiveSimulationArtifacts();
          const item = window.__wcag22LastAudit && window.__wcag22LastAudit.issues[msg.index];
          const liveEl = window.__wcag22IssueElements && window.__wcag22IssueElements[msg.index];
          if (item && item.bbox) {
            if (host) host.style.display = "none";

            if (liveEl && liveEl.isConnected) {
              const layer = getLayerRoot(liveEl);
              if (layer !== document.body || item.bbox.y < window.innerHeight * 0.42) {
                window.scrollTo(0, 0);
              } else {
                liveEl.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
              }
            } else {
              const targetScrollY = item.bbox.y < window.innerHeight * 0.42
                ? 0
                : Math.max(0, item.bbox.y - Math.round(window.innerHeight / 3));
              window.scrollTo(0, targetScrollY);
            }

            waitForScrollAndStickyHeaderSettle(350).then(() => {
              const rectNow = (liveEl && liveEl.isConnected)
                ? getGlobalViewportRect(liveEl)
                : {
                    left: item.bbox.x - window.scrollX,
                    top: item.bbox.y - window.scrollY,
                    width: item.bbox.w,
                    height: item.bbox.h
                  };

              sendResponse({
                ok: true,
                settledMs: 350,
                viewportRect: {
                  x: rectNow.left,
                  y: rectNow.top,
                  w: rectNow.width,
                  h: rectNow.height,
                  vw: window.innerWidth,
                  vh: window.innerHeight,
                  dpr: window.devicePixelRatio || 1
                }
              });
            });
            return true;
          } else {
            sendResponse({ ok: false });
          }
        } else if (msg.type === "RESTORE_HUD_AFTER_CROP") {
          if (host) host.style.display = "block";
          if (root) {
            root.classList.toggle("hide-tabmap", !window.__wcag22ShowTabMap);
            root.querySelectorAll(".box").forEach(b => {
              b.style.display = "";
            });
          }
          sendResponse({ ok: true });
        }
        return false;
      });
    }
  }

  return runFullAudit();
})();
