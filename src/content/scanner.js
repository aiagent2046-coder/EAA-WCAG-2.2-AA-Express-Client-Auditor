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

  function clearLiveSimulationArtifacts() {
    const prevStyle = document.getElementById(SIM_STYLE_ID);
    if (prevStyle) prevStyle.remove();
    document.querySelectorAll('[data-wcag22-sim]').forEach(el => {
      el.removeAttribute('data-wcag22-sim');
    });
    window.__wcag22SimActive = false;
  }

  function isElementRendered(el) {
    if (!(el instanceof Element)) return false;
    if (el.id === HUD_ID || el.closest(`#${HUD_ID}`)) return false;
    if (el.closest('[hidden], [inert], [aria-hidden="true"]')) return false;

    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
      return false;
    }

    let child = el;
    let parent = el.parentElement;
    while (parent && parent !== document.documentElement) {
      if (parent.tagName === 'DETAILS' && !parent.open) {
        if (child.tagName !== 'SUMMARY') return false;
      }
      const ps = window.getComputedStyle(parent);
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
      child = parent;
      parent = parent.parentElement;
    }

    const rect = el.getBoundingClientRect();
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
    const nodes = Array.from(document.querySelectorAll(INTERACTIVE_SELECTOR)).filter(isElementRendered);
    const targets = nodes.map(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
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

  function auditFocusAndTabOrder(maxNodes = 150) {
    const prevScrollX = window.scrollX;
    const prevScrollY = window.scrollY;
    const prevActive = document.activeElement;

    const hudEl = document.getElementById(HUD_ID);
    const prevHudDisplay = hudEl ? hudEl.style.display : '';
    if (hudEl) hudEl.style.display = 'none';

    const rawFocusables = Array.from(document.querySelectorAll(FOCUSABLE_SELECTOR))
      .filter(el => isElementRendered(el) && el.tabIndex >= 0);

    const positiveTabs = rawFocusables
      .filter(el => el.tabIndex > 0)
      .sort((a, b) => a.tabIndex - b.tabIndex);
    const normalTabs = rawFocusables.filter(el => el.tabIndex === 0);
    const focusables = [...positiveTabs, ...normalTabs].slice(0, maxNodes);

    const issues = [];
    const tabStops = [];

    focusables.forEach((el, idx) => {
      const r0 = el.getBoundingClientRect();
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

    for (const el of focusables) {
      const isTextEntry = (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'file', 'color'].includes((el.type || '').toLowerCase())) ||
        el.tagName === 'TEXTAREA';
      let preFocusSig = null;
      if (isTextEntry) {
        const stBefore = window.getComputedStyle(el);
        preFocusSig = {
          boxShadow: stBefore.boxShadow,
          borderTopColor: stBefore.borderTopColor,
          borderTopWidth: stBefore.borderTopWidth,
          backgroundColor: stBefore.backgroundColor
        };
      }

      try {
        el.focus({ preventScroll: false });
      } catch (_) {
        continue;
      }

      const r = el.getBoundingClientRect();
      const stFocus = window.getComputedStyle(el);

      const outlineW = parseFloat(stFocus.outlineWidth) || 0;
      const hasOutline = stFocus.outlineStyle !== 'none' && outlineW > 0;

      if (isTextEntry && preFocusSig && !hasOutline) {
        const shadowUnchanged = stFocus.boxShadow === preFocusSig.boxShadow;
        const borderUnchanged = stFocus.borderTopColor === preFocusSig.borderTopColor &&
          stFocus.borderTopWidth === preFocusSig.borderTopWidth;
        const bgUnchanged = stFocus.backgroundColor === preFocusSig.backgroundColor;
        if (shadowUnchanged && borderUnchanged && bgUnchanged) {
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
            actual: 'outline: none and zero border/box-shadow change when focused',
            fixCode: ':focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }',
            bbox: { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }
          });
        }
      } else if (hasOutline) {
        const outColor = parseRgba(stFocus.outlineColor);
        if (outColor && outColor.a > 0.1) {
          const bgColor = getEffectiveBackgroundRgb(el.parentElement || el);
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

      if (isOversizedScrollContainer(el, r)) continue;

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
            const st = window.getComputedStyle(n);
            return st.pointerEvents !== 'none' && parseFloat(st.opacity) > 0.05;
          });

          if (!topHit || el === topHit || el.contains(topHit) || topHit.contains(el)) {
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

    if (hudEl) hudEl.style.display = prevHudDisplay;
    if (prevActive && typeof prevActive.focus === 'function') {
      try { prevActive.focus({ preventScroll: true }); } catch (_) {}
    }
    window.scrollTo(prevScrollX, prevScrollY);
    return { issues, checkedCount: focusables.length, tabStops };
  }

  function auditAccessibleAuthAndRedundantEntry() {
    const issues = [];
    const authInputs = Array.from(document.querySelectorAll(
      'input[type="password"], input[autocomplete*="password"], input[autocomplete="one-time-code"]'
    )).filter(isElementRendered);

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
      default:
        return {
          title: iss.title,
          beforeCap: 'Текущее состояние с риском EAA',
          afterCap: 'Исправлено по WCAG 2.2 AA',
          kind: 'generic'
        };
    }
  }

  function syncHudBoxesToLiveDom() {
    const host = document.getElementById(HUD_ID);
    const root = host && host.shadowRoot && host.shadowRoot.getElementById('hud-root');
    if (!root || !window.__wcag22IssueElements) return;

    root.querySelectorAll('.box').forEach(box => {
      const idx = Number(box.dataset.idx);
      const liveEl = window.__wcag22IssueElements[idx];
      if (liveEl && liveEl.isConnected && isElementRendered(liveEl)) {
        const nr = liveEl.getBoundingClientRect();
        box.style.left = `${Math.max(0, nr.left + window.scrollX - 3)}px`;
        box.style.top = `${Math.max(0, nr.top + window.scrollY - 3)}px`;
        box.style.width = `${Math.max(18, nr.width + 6)}px`;
        box.style.height = `${Math.max(18, nr.height + 6)}px`;
        const badge = box.querySelector('.badge');
        if (badge) {
          badge.classList.toggle('badge-below', nr.top < 26);
        }
      }
    });
  }

  function setLiveFixSimulation(enabled) {
    clearLiveSimulationArtifacts();
    const host = document.getElementById(HUD_ID);
    const root = host && host.shadowRoot && host.shadowRoot.getElementById('hud-root');
    const audit = window.__wcag22LastAudit;

    if (!enabled || !audit) {
      if (root) {
        root.classList.remove('sim-fixed');
        root.querySelectorAll('.box .badge').forEach(b => {
          if (b.dataset.beforeText) b.textContent = b.dataset.beforeText;
        });
        const btnBefore = root.querySelector('#dock-btn-before');
        const btnAfter = root.querySelector('#dock-btn-after');
        if (btnBefore) btnBefore.classList.add('is-active');
        if (btnAfter) btnAfter.classList.remove('is-active');
        const cardSimBtn = root.querySelector('#insp-toggle-sim');
        if (cardSimBtn) {
          cardSimBtn.textContent = '✨ Применить «ПОСЛЕ» прямо на сайте';
          cardSimBtn.classList.remove('is-after');
        }
      }
      setTimeout(syncHudBoxesToLiveDom, 40);
      return { ok: true, active: false };
    }

    let maxScrollPad = 96;
    const includeWarnings = Boolean(window.__wcag22ShowWarnings);
    const activeInspIdx = typeof window.__wcag22ActiveIdx === 'number' ? window.__wcag22ActiveIdx : -1;

    audit.issues.forEach((iss, idx) => {
      const shouldMorph = iss.severity === 'fail' || includeWarnings || idx === activeInspIdx;
      if (!shouldMorph) return;

      const liveEl = window.__wcag22IssueElements?.[idx];
      if (!liveEl || !liveEl.isConnected) return;

      if (iss.code === 'FOCUS_RING_SUPPRESSED' || iss.code === 'FOCUS_APPEARANCE_LOW') {
        liveEl.setAttribute('data-wcag22-sim', 'focus');
      } else if (iss.code === 'TARGET_COLLISION' || iss.code === 'TARGET_SPACING_PASS') {
        liveEl.setAttribute('data-wcag22-sim', 'target');
      } else if (iss.code === 'FOCUS_OBSCURED_FULL' || iss.code === 'FOCUS_OBSCURED_PARTIAL') {
        liveEl.setAttribute('data-wcag22-sim', 'scroll');
        maxScrollPad = Math.max(maxScrollPad, (iss.params?.blockerH || 96) + 24);
      }
    });

    const styleEl = document.createElement('style');
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
        transition: all 0.22s ease !important;
      }
      [data-wcag22-sim="scroll"] {
        scroll-margin-top: ${maxScrollPad}px !important;
      }
    `;
    document.head.appendChild(styleEl);
    window.__wcag22SimActive = true;

    if (root) {
      root.classList.add('sim-fixed');
      root.querySelectorAll('.box .badge').forEach(b => {
        const idx = Number(b.parentElement?.dataset?.idx);
        const liveEl = window.__wcag22IssueElements?.[idx];
        if (liveEl && liveEl.hasAttribute('data-wcag22-sim') && b.dataset.afterText) {
          b.textContent = b.dataset.afterText;
        }
      });
      const btnBefore = root.querySelector('#dock-btn-before');
      const btnAfter = root.querySelector('#dock-btn-after');
      if (btnBefore) btnBefore.classList.remove('is-active');
      if (btnAfter) btnAfter.classList.add('is-active');
      const cardSimBtn = root.querySelector('#insp-toggle-sim');
      if (cardSimBtn) {
        cardSimBtn.textContent = '↩ Вернуть «ДО» (показать исходную ошибку)';
        cardSimBtn.classList.add('is-after');
      }
    }

    // Re-scroll active obscured element so user sees it jump cleanly out from behind sticky header!
    if (activeInspIdx >= 0) {
      const activeEl = window.__wcag22IssueElements?.[activeInspIdx];
      const activeIss = audit.issues[activeInspIdx];
      if (activeEl && activeEl.isConnected && activeIss?.criterion === '2.4.11') {
        activeEl.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    }

    setTimeout(syncHudBoxesToLiveDom, 60);
    return { ok: true, active: true };
  }

  function openInspectorForIndex(idx, shouldScroll = true) {
    const audit = window.__wcag22LastAudit;
    const host = document.getElementById(HUD_ID);
    const root = host && host.shadowRoot && host.shadowRoot.getElementById('hud-root');
    if (!audit || !root || !audit.issues[idx]) return;

    window.__wcag22ActiveIdx = idx;
    const iss = audit.issues[idx];
    const liveEl = window.__wcag22IssueElements?.[idx];

    if (shouldScroll) {
      if (liveEl && liveEl.isConnected) {
        const layer = getLayerRoot(liveEl);
        if (layer !== document.body) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          liveEl.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
        }
      } else if (iss.bbox) {
        window.scrollTo({ top: Math.max(0, iss.bbox.y - window.innerHeight / 3), behavior: 'smooth' });
      }
    }

    root.querySelectorAll('.box').forEach(b => b.classList.remove('pulse', 'force-show'));
    const targetBox = root.querySelector(`.box[data-idx="${idx}"]`);
    if (targetBox) {
      targetBox.classList.add('force-show', 'pulse');
      setTimeout(() => targetBox.classList.remove('pulse'), 1300);
    }

    // Update stepper counter in Dock
    const visIndices = getVisibleIssueIndices();
    const posInVis = visIndices.indexOf(idx);
    const stepLbl = root.querySelector('#dock-step-lbl');
    if (stepLbl) {
      stepLbl.textContent = `${posInVis >= 0 ? posInVis + 1 : idx + 1} / ${Math.max(1, visIndices.length)}`;
    }

    // Render / position the On-Page Before/After Visual Inspector Card
    const card = root.querySelector('#wcag22-inspector-card');
    if (!card) return;

    const spec = getVisualBeforeAfterSpec(iss);
    const isUnlocked = idx === 0 || Boolean(window.__wcag22ProUnlocked);

    let beforeArt = '';
    let afterArt = '';
    if (spec.kind === 'focus') {
      beforeArt = `<div class="mini-input mini-no-ring">Поиск...</div>`;
      afterArt = `<div class="mini-input mini-has-ring">Поиск...</div>`;
    } else if (spec.kind === 'target') {
      beforeArt = `<div class="mini-ring-bad"><span class="mini-btn-tiny">Кнопка</span></div>`;
      afterArt = `<div class="mini-btn-good">Кнопка ≥ 24px</div>`;
    } else if (spec.kind === 'sticky') {
      beforeArt = `<div class="mini-sticky-wrap"><div class="mini-sticky-bar">ШАПКА</div><div class="mini-hidden-link">Ссылка скрыта</div></div>`;
      afterArt = `<div class="mini-sticky-wrap"><div class="mini-sticky-bar">ШАПКА</div><div class="mini-clear-link">Ссылка видна ✓</div></div>`;
    } else {
      beforeArt = `<div class="mini-generic-bad">Дефект SC ${iss.criterion}</div>`;
      afterArt = `<div class="mini-generic-good">Норма WCAG 2.2 ✓</div>`;
    }

    card.innerHTML = `
      <div class="insp-head">
        <span class="insp-pill sev-${iss.severity}">#${idx + 1} · SC ${iss.criterion} · ${iss.severity === 'fail' ? 'ОШИБКА AA' : 'РИСК'}</span>
        <button type="button" class="insp-close" id="insp-close-btn" title="Закрыть карточку">&times;</button>
      </div>
      <div class="insp-title">${spec.title}</div>
      <div class="insp-el-name">${iss.elementLabel ? `Элемент: «${iss.elementLabel}»` : iss.selector}</div>

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

      <button type="button" id="insp-toggle-sim" class="insp-sim-btn ${window.__wcag22SimActive ? 'is-after' : ''}">
        ${window.__wcag22SimActive ? '↩ Вернуть «ДО» (показать исходную ошибку)' : '✨ Применить «ПОСЛЕ» прямо на сайте'}
      </button>

      ${isUnlocked
        ? `<div class="insp-code">${iss.fixCode}</div>`
        : `<button type="button" id="insp-unlock-cta" class="insp-unlock-btn">🔒 Открыть CSS-код и полный PDF-отчет ($10/мес) →</button>`
      }
    `;

    card.hidden = false;

    // Position card near target element (clamped cleanly inside viewport, above the bottom dock!)
    setTimeout(() => {
      const r = (liveEl && liveEl.isConnected)
        ? liveEl.getBoundingClientRect()
        : { left: 24, top: 80, bottom: 110, width: 120, height: 30 };

      const cardW = 348;
      const cardH = card.offsetHeight || 270;
      const left = Math.max(14, Math.min(window.innerWidth - cardW - 14, r.left));
      let top = r.bottom + (r.top < 26 ? 32 : 16);
      if (top + cardH > window.innerHeight - 78) {
        top = Math.max(14, r.top - cardH - 14);
      }
      card.style.left = `${Math.round(left)}px`;
      card.style.top = `${Math.round(top)}px`;
    }, 30);

    card.querySelector('#insp-close-btn')?.addEventListener('click', () => {
      card.hidden = true;
    });
    card.querySelector('#insp-toggle-sim')?.addEventListener('click', () => {
      setLiveFixSimulation(!window.__wcag22SimActive);
    });
    card.querySelector('#insp-unlock-cta')?.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ type: 'OPEN_REPORT_FROM_PAGE', mode: 'pdf', audit: window.__wcag22LastAudit });
      }
    });

    // If simulation is already active, ensure newly selected item also morphs!
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
      if (iss.severity === 'fail' || showWarn) out.push(i);
    });
    return out;
  }

  function renderShadowHud(issues, tabStops, showWarnings = false, showTabMap = false, counts = {}) {
    let host = document.getElementById(HUD_ID);
    if (host) host.remove();

    host = document.createElement('div');
    host.id = HUD_ID;
    host.setAttribute('translate', 'no');
    host.className = 'notranslate';
    host.style.cssText = 'position:absolute;top:0;left:0;width:0;height:0;z-index:2147483646;pointer-events:none;';
    const shadow = host.attachShadow({ mode: 'open' });

    const wrapper = document.createElement('div');
    wrapper.id = 'hud-root';
    if (!showWarnings) wrapper.classList.add('fails-only');
    if (!showTabMap) wrapper.classList.add('hide-tabmap');

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .box {
        position: absolute;
        pointer-events: none;
        border-radius: 5px;
        transition: all 0.22s ease;
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
        border: 2.5px solid #ef4444;
        background: rgba(239, 68, 68, 0.13);
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.20), 0 4px 14px rgba(15, 23, 42, 0.24);
      }
      .box-obscured {
        background: repeating-linear-gradient(
          -45deg,
          rgba(239, 68, 68, 0.26) 0px,
          rgba(239, 68, 68, 0.26) 6px,
          rgba(239, 68, 68, 0.08) 6px,
          rgba(239, 68, 68, 0.08) 12px
        );
      }
      .box-warning { border: 2px dashed #f59e0b; background: rgba(245, 158, 11, 0.10); }
      .box-manual { border: 2px dotted #3b82f6; background: rgba(59, 130, 246, 0.10); }

      .target-ring-24 {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 24px;
        height: 24px;
        margin-left: -12px;
        margin-top: -12px;
        border-radius: 999px;
        border: 1.5px dashed #ef4444;
        background: rgba(239, 68, 68, 0.16);
      }

      .badge {
        position: absolute;
        top: -23px;
        left: -2px;
        pointer-events: auto;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-weight: 700;
        font-size: 10.5px;
        line-height: 15px;
        color: #ffffff;
        padding: 2px 8px;
        border-radius: 999px;
        white-space: nowrap;
        box-shadow: 0 3px 8px rgba(15, 23, 42, 0.35);
        transition: transform 0.15s ease, background 0.2s ease;
      }
      .badge:hover { transform: scale(1.06); }
      .badge.badge-below { top: auto; bottom: -23px; }
      .box-fail .badge { background: #dc2626; }
      .box-warning .badge { background: #d97706; }
      .box-manual .badge { background: #2563eb; }

      /* Live Fix Simulation State ("ПОСЛЕ") */
      #hud-root.sim-fixed .box-fail,
      #hud-root.sim-fixed .box-warning {
        border: 2.5px solid #10b981 !important;
        background: rgba(16, 185, 129, 0.12) !important;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.22) !important;
      }
      #hud-root.sim-fixed .box-fail .badge,
      #hud-root.sim-fixed .box-warning .badge {
        background: #059669 !important;
      }
      #hud-root.sim-fixed .target-ring-24 {
        border-color: #10b981 !important;
        background: rgba(16, 185, 129, 0.16) !important;
      }

      .pulse {
        transform: scale(1.04);
        box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.45) !important;
      }

      /* Floating On-Page Interactive Before/After Studio Dock */
      .auditor-dock {
        position: fixed;
        bottom: 16px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483647;
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 7px 11px;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.95);
        backdrop-filter: blur(10px);
        border: 1.5px solid #334155;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.50);
        color: #f8fafc;
        width: max-content;
        max-width: calc(100vw - 24px);
        flex-wrap: wrap;
        justify-content: center;
      }
      .dock-score {
        font-size: 11.5px;
        font-weight: 800;
        padding: 4px 9px;
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
        font-size: 11.5px;
        font-weight: 700;
        padding: 5px 11px;
        border-radius: 999px;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.15s ease;
      }
      .seg-btn.seg-before.is-active {
        background: #dc2626;
        color: #ffffff;
      }
      .seg-btn.seg-after.is-active {
        background: #10b981;
        color: #052e16;
      }
      .dock-stepper {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 999px;
        padding: 2px 6px;
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
      #dock-step-lbl { font-size: 11px; font-weight: 700; color: #cbd5e1; min-width: 36px; text-align: center; }

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
      .dock-chip.is-on {
        border-color: #f59e0b;
        background: rgba(245, 158, 11, 0.18);
        color: #fde68a;
      }
      .dock-chip-tab.is-on {
        border-color: #8b5cf6;
        background: rgba(139, 92, 246, 0.22);
        color: #ddd6fe;
      }
      .dock-report-btn {
        border: none;
        background: #3b82f6;
        color: #ffffff;
        font-size: 11.5px;
        font-weight: 700;
        padding: 6px 12px;
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
        padding: 2px 6px;
        cursor: pointer;
      }
      .dock-close:hover { color: #ffffff; }

      /* Floating On-Page Visual Inspector Card ("ДО vs ПОСЛЕ") */
      .inspector-card[hidden] { display: none !important; }
      .inspector-card {
        position: fixed;
        z-index: 2147483647;
        pointer-events: auto;
        width: 348px;
        background: rgba(15, 23, 42, 0.97);
        backdrop-filter: blur(12px);
        color: #f8fafc;
        border: 1.5px solid #475569;
        border-radius: 14px;
        padding: 13px 14px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.55);
      }
      .insp-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      }
      .insp-pill {
        font-size: 10.5px;
        font-weight: 800;
        padding: 2px 8px;
        border-radius: 999px;
      }
      .insp-pill.sev-fail { background: rgba(239, 68, 68, 0.22); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.45); }
      .insp-pill.sev-warning, .insp-pill.sev-manual { background: rgba(245, 158, 11, 0.22); color: #fde68a; border: 1px solid rgba(245, 158, 11, 0.45); }
      .insp-close {
        border: none;
        background: #1e293b;
        color: #cbd5e1;
        width: 24px;
        height: 24px;
        border-radius: 6px;
        font-size: 16px;
        cursor: pointer;
      }
      .insp-title { font-size: 13px; font-weight: 700; color: #ffffff; margin-bottom: 3px; }
      .insp-el-name {
        font-size: 11px;
        color: #93c5fd;
        margin-bottom: 9px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .insp-compare {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-bottom: 9px;
      }
      .insp-col {
        border-radius: 9px;
        padding: 8px;
        text-align: center;
      }
      .insp-col-before {
        background: rgba(239, 68, 68, 0.09);
        border: 1px solid rgba(239, 68, 68, 0.35);
      }
      .insp-col-after {
        background: rgba(16, 185, 129, 0.09);
        border: 1px solid rgba(16, 185, 129, 0.35);
      }
      .insp-col-tag { font-size: 10px; font-weight: 800; margin-bottom: 6px; }
      .tag-b { color: #fca5a5; }
      .tag-a { color: #6ee7b7; }
      .insp-stage {
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 5px;
      }
      .insp-cap { font-size: 10px; color: #cbd5e1; line-height: 1.25; }

      /* Schematic Visual Miniatures inside Inspector Card */
      .mini-input {
        background: #ffffff;
        color: #334155;
        font-size: 10px;
        padding: 4px 10px;
        border-radius: 4px;
        border: 1px solid #cbd5e1;
      }
      .mini-has-ring {
        outline: 2.5px solid #2563eb;
        outline-offset: 2px;
        box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.3);
      }
      .mini-ring-bad {
        width: 30px;
        height: 30px;
        border-radius: 999px;
        border: 1.5px dashed #ef4444;
        background: rgba(239, 68, 68, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .mini-btn-tiny {
        font-size: 8.5px;
        background: #334155;
        color: #fff;
        padding: 1px 4px;
        line-height: 11px;
        border-radius: 2px;
      }
      .mini-btn-good {
        font-size: 10px;
        font-weight: 700;
        background: rgba(16, 185, 129, 0.25);
        border: 1.5px dashed #10b981;
        color: #ecfdf5;
        padding: 5px 10px;
        border-radius: 5px;
      }
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
      .insp-sim-btn.is-after {
        background: #059669;
        color: #ffffff;
      }
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
      const box = document.createElement('div');
      const extraCls = issue.code === 'FOCUS_OBSCURED_FULL' ? ' box-obscured' : '';
      box.className = `box box-${issue.severity}${extraCls}`;
      box.dataset.idx = String(idx);
      box.style.left = `${Math.max(0, issue.bbox.x - 3)}px`;
      box.style.top = `${Math.max(0, issue.bbox.y - 3)}px`;
      box.style.width = `${Math.max(18, issue.bbox.w + 6)}px`;
      box.style.height = `${Math.max(18, issue.bbox.h + 6)}px`;

      if (issue.criterion === '2.5.8') {
        const ring = document.createElement('span');
        ring.className = 'target-ring-24';
        box.appendChild(ring);
      }

      const badge = document.createElement('span');
      badge.className = issue.bbox.y < 26 ? 'badge badge-below' : 'badge';
      const defaultLabel = `#${idx + 1} · ${issue.hudCallout || `SC ${issue.criterion}`}`;
      badge.dataset.beforeText = defaultLabel;
      badge.dataset.afterText = `#${idx + 1} ✓ ИСПРАВЛЕНО (SC ${issue.criterion})`;
      badge.textContent = defaultLabel;
      badge.title = 'Нажмите для сравнения ДО / ПОСЛЕ';
      badge.addEventListener('click', e => {
        e.stopPropagation();
        openInspectorForIndex(idx, false);
      });
      box.appendChild(badge);
      wrapper.appendChild(box);
    });

    if (Array.isArray(tabStops) && tabStops.length > 0) {
      const tabLayer = document.createElement('div');
      tabLayer.className = 'tabmap-layer';

      const docW = Math.max(document.documentElement.scrollWidth, window.innerWidth);
      const docH = Math.max(document.documentElement.scrollHeight, window.innerHeight);
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('class', 'tabmap-svg');
      svg.setAttribute('width', String(docW));
      svg.setAttribute('height', String(docH));

      if (tabStops.length > 1) {
        const poly = document.createElementNS(svgNS, 'polyline');
        poly.setAttribute('points', tabStops.map(s => `${s.x},${s.y}`).join(' '));
        poly.setAttribute('fill', 'none');
        poly.setAttribute('stroke', 'rgba(124, 58, 237, 0.72)');
        poly.setAttribute('stroke-width', '2');
        poly.setAttribute('stroke-dasharray', '4 3');
        svg.appendChild(poly);
      }
      tabLayer.appendChild(svg);

      tabStops.slice(0, 99).forEach(s => {
        const dot = document.createElement('div');
        dot.className = 'tab-stop-dot';
        dot.style.left = `${s.x}px`;
        dot.style.top = `${s.y}px`;
        dot.textContent = String(s.order);
        tabLayer.appendChild(dot);
      });

      wrapper.appendChild(tabLayer);
    }

    // Inspector Popover Container
    const inspCard = document.createElement('div');
    inspCard.id = 'wcag22-inspector-card';
    inspCard.className = 'inspector-card';
    inspCard.hidden = true;
    wrapper.appendChild(inspCard);

    // Floating On-Page Before/After Studio Dock
    const dock = document.createElement('div');
    dock.id = 'wcag22-auditor-dock';
    dock.className = 'auditor-dock';

    const initVisCount = showWarnings ? issues.length : issues.filter(i => i.severity === 'fail').length;
    dock.innerHTML = `
      <span class="dock-score">EAA ${counts.score ?? 100}% · 🔴 ${counts.fail ?? 0}</span>
      <div class="dock-seg" role="group" aria-label="Before and After Simulation">
        <button type="button" id="dock-btn-before" class="seg-btn seg-before is-active">🔴 ДО (Ошибки)</button>
        <button type="button" id="dock-btn-after" class="seg-btn seg-after">🟢 ПОСЛЕ (Как исправить)</button>
      </div>
      <div class="dock-stepper">
        <button type="button" id="dock-prev" class="step-arrow" title="Предыдущий элемент">◀</button>
        <span id="dock-step-lbl">${initVisCount > 0 ? `1 / ${initVisCount}` : '0 / 0'}</span>
        <button type="button" id="dock-next" class="step-arrow" title="Следующий элемент">▶</button>
      </div>
      <button type="button" id="dock-warn-chip" class="dock-chip ${showWarnings ? 'is-on' : ''}">+Риски (${counts.warning ?? 0})</button>
      <button type="button" id="dock-tab-chip" class="dock-chip dock-chip-tab ${showTabMap ? 'is-on' : ''}">Tab#</button>
      <button type="button" id="dock-open-report" class="dock-report-btn">📄 Отчет / PDF</button>
      <button type="button" id="dock-close-hud" class="dock-close" title="Скрыть панель">&times;</button>
    `;
    wrapper.appendChild(dock);

    shadow.appendChild(wrapper);
    document.documentElement.appendChild(host);

    // Wire up On-Page Dock interactions
    dock.querySelector('#dock-btn-before')?.addEventListener('click', () => {
      setLiveFixSimulation(false);
    });
    dock.querySelector('#dock-btn-after')?.addEventListener('click', () => {
      // If page has 0 AA fails but has warnings, auto-enable +Риски so user immediately sees warnings morph!
      if ((counts.fail || 0) === 0 && (counts.warning || 0) > 0 && !window.__wcag22ShowWarnings) {
        window.__wcag22ShowWarnings = true;
        wrapper.classList.remove('fails-only');
        dock.querySelector('#dock-warn-chip')?.classList.add('is-on');
      }
      setLiveFixSimulation(true);
      const vis = getVisibleIssueIndices();
      if (vis.length > 0 && (typeof window.__wcag22ActiveIdx !== 'number' || window.__wcag22ActiveIdx < 0)) {
        openInspectorForIndex(vis[0], false);
      }
    });

    dock.querySelector('#dock-prev')?.addEventListener('click', () => {
      const vis = getVisibleIssueIndices();
      if (!vis.length) return;
      const curPos = vis.indexOf(window.__wcag22ActiveIdx ?? vis[0]);
      const nextPos = (curPos - 1 + vis.length) % vis.length;
      openInspectorForIndex(vis[nextPos], true);
    });
    dock.querySelector('#dock-next')?.addEventListener('click', () => {
      const vis = getVisibleIssueIndices();
      if (!vis.length) return;
      const curPos = vis.indexOf(window.__wcag22ActiveIdx ?? -1);
      const nextPos = (curPos + 1) % vis.length;
      openInspectorForIndex(vis[nextPos], true);
    });

    dock.querySelector('#dock-warn-chip')?.addEventListener('click', e => {
      window.__wcag22ShowWarnings = !window.__wcag22ShowWarnings;
      wrapper.classList.toggle('fails-only', !window.__wcag22ShowWarnings);
      e.currentTarget.classList.toggle('is-on', window.__wcag22ShowWarnings);
      const vis = getVisibleIssueIndices();
      const stepLbl = dock.querySelector('#dock-step-lbl');
      if (stepLbl) stepLbl.textContent = vis.length ? `1 / ${vis.length}` : '0 / 0';
      if (window.__wcag22SimActive) setLiveFixSimulation(true);
    });

    dock.querySelector('#dock-tab-chip')?.addEventListener('click', e => {
      window.__wcag22ShowTabMap = !window.__wcag22ShowTabMap;
      wrapper.classList.toggle('hide-tabmap', !window.__wcag22ShowTabMap);
      e.currentTarget.classList.toggle('is-on', window.__wcag22ShowTabMap);
    });

    dock.querySelector('#dock-open-report')?.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ type: 'OPEN_REPORT_FROM_PAGE', mode: 'pdf', audit: window.__wcag22LastAudit });
      }
    });

    dock.querySelector('#dock-close-hud')?.addEventListener('click', () => {
      clearLiveSimulationArtifacts();
      host.style.display = 'none';
    });
  }

  function computeReadinessScore(failCount, warnCount, checkedNodes) {
    if (checkedNodes <= 0) return 100;
    const penalty = failCount * 12 + Math.min(24, warnCount * 1.5);
    return Math.max(5, Math.min(100, Math.round(100 - penalty)));
  }

  function refreshProCacheFlag() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.get(['monetize_paid_verified', 'dev_pro_override_v23'], res => {
          window.__wcag22ProUnlocked = Boolean(res?.monetize_paid_verified || res?.dev_pro_override_v23);
        });
      }
    } catch (_) {}
  }

  function runFullAudit() {
    clearLiveSimulationArtifacts();
    window.__wcag22ActiveIdx = -1;
    refreshProCacheFlag();

    const startedAt = performance.now();
    const r258 = auditTargetSize258();
    const rFocus = auditFocusAndTabOrder();
    const rAuth = auditAccessibleAuthAndRedundantEntry();
    const r257 = auditDraggingCandidates257();
    const overlayIssues = auditAccessibilityOverlays();
    const helpProfile = extractConsistentHelpMechanisms();

    const order = { fail: 0, warning: 1, manual: 2 };
    const sortedWithRefs = [
      ...r258.issues,
      ...rFocus.issues,
      ...rAuth.issues,
      ...r257.issues,
      ...overlayIssues
    ].sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));

    window.__wcag22IssueElements = sortedWithRefs.map(item => item._el || null);
    const allIssues = sortedWithRefs.map(({ _el, ...serializable }) => serializable);

    const failCount = allIssues.filter(i => i.severity === 'fail').length;
    const warnCount = allIssues.filter(i => i.severity === 'warning').length;
    const manualCount = allIssues.filter(i => i.severity === 'manual').length;
    const checkedNodes = r258.checkedCount + rFocus.checkedCount;
    const readinessScore = computeReadinessScore(failCount, warnCount, checkedNodes);

    const result = {
      auditorVersion: '0.6.0',
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

    // Auto-open the visual "ДО vs ПОСЛЕ" inspector card on Finding #1 if an AA fail exists!
    if (failCount > 0) {
      openInspectorForIndex(0, false);
    }

    return result;
  }

  if (!window.__wcag22ListenerInstalled) {
    window.__wcag22ListenerInstalled = true;
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (!msg || !msg.type) return false;
        const host = document.getElementById(HUD_ID);
        const root = host && host.shadowRoot && host.shadowRoot.getElementById('hud-root');

        if (msg.type === 'HIGHLIGHT_ISSUE') {
          if (host) host.style.display = 'block';
          openInspectorForIndex(msg.index, true);
          sendResponse({ ok: true });
        } else if (msg.type === 'SIMULATE_FIXES') {
          if (host) host.style.display = 'block';
          sendResponse(setLiveFixSimulation(Boolean(msg.enabled)));
        } else if (msg.type === 'TOGGLE_HUD') {
          if (!msg.visible) clearLiveSimulationArtifacts();
          if (host) host.style.display = msg.visible ? 'block' : 'none';
          sendResponse({ ok: true });
        } else if (msg.type === 'SET_HUD_WARNINGS') {
          window.__wcag22ShowWarnings = Boolean(msg.showWarnings);
          if (root) {
            root.classList.toggle('fails-only', !window.__wcag22ShowWarnings);
            root.querySelector('#dock-warn-chip')?.classList.toggle('is-on', window.__wcag22ShowWarnings);
          }
          if (window.__wcag22SimActive) setLiveFixSimulation(true);
          sendResponse({ ok: true });
        } else if (msg.type === 'SET_HUD_TABMAP') {
          window.__wcag22ShowTabMap = Boolean(msg.showTabMap);
          if (root) {
            root.classList.toggle('hide-tabmap', !window.__wcag22ShowTabMap);
            root.querySelector('#dock-tab-chip')?.classList.toggle('is-on', window.__wcag22ShowTabMap);
          }
          sendResponse({ ok: true });
        } else if (msg.type === 'SCROLL_FOR_CROP') {
          clearLiveSimulationArtifacts();
          const item = window.__wcag22LastAudit && window.__wcag22LastAudit.issues[msg.index];
          const liveEl = window.__wcag22IssueElements && window.__wcag22IssueElements[msg.index];
          if (item && item.bbox) {
            if (host) host.style.display = 'none';

            if (liveEl && liveEl.isConnected) {
              const layer = getLayerRoot(liveEl);
              if (layer !== document.body || item.bbox.y < window.innerHeight * 0.42) {
                window.scrollTo(0, 0);
              } else {
                liveEl.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
              }
            } else {
              const targetScrollY = item.bbox.y < window.innerHeight * 0.42
                ? 0
                : Math.max(0, item.bbox.y - Math.round(window.innerHeight / 3));
              window.scrollTo(0, targetScrollY);
            }

            const rectNow = (liveEl && liveEl.isConnected)
              ? liveEl.getBoundingClientRect()
              : {
                  left: item.bbox.x - window.scrollX,
                  top: item.bbox.y - window.scrollY,
                  width: item.bbox.w,
                  height: item.bbox.h
                };

            sendResponse({
              ok: true,
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
          } else {
            sendResponse({ ok: false });
          }
        } else if (msg.type === 'RESTORE_HUD_AFTER_CROP') {
          if (host) host.style.display = 'block';
          if (root) {
            root.classList.toggle('hide-tabmap', !window.__wcag22ShowTabMap);
            root.querySelectorAll('.box').forEach(b => {
              b.style.display = '';
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
