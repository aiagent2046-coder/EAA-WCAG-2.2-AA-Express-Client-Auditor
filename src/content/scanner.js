(() => {
  const HUD_ID = 'wcag22-express-auditor-hud';

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

  function isElementRendered(el) {
    if (!(el instanceof Element)) return false;
    if (el.id === HUD_ID || el.closest(`#${HUD_ID}`)) return false;
    if (el.closest('[hidden], [inert], [aria-hidden="true"]')) return false;

    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
      return false;
    }

    // Walk ancestors to filter content inside closed <details> or collapsed 0px overflow:hidden accordions
    let child = el;
    let parent = el.parentElement;
    while (parent && parent !== document.documentElement) {
      if (parent.tagName === 'DETAILS' && !parent.open) {
        // Inside a closed <details>, ONLY its direct <summary> subtree is rendered & interactive
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

  function isInlineTextException(el, style) {
    if (style.display !== 'inline') return false;
    const parent = el.parentElement;
    if (!parent) return false;
    const pStyle = window.getComputedStyle(parent);
    if (pStyle.display.includes('flex') || pStyle.display.includes('grid')) return false;
    const parentText = (parent.textContent || '').replace(/\s+/g, ' ').trim();
    const ownText = (el.textContent || '').replace(/\s+/g, ' ').trim();
    return parentText.length > ownText.length + 2;
  }

  function isNativeUnstyledControl(el, style) {
    if (!['INPUT', 'SELECT'].includes(el.tagName)) return false;
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
      return {
        el,
        rect,
        style,
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2,
        undersized: rect.width < 23.95 || rect.height < 23.95
      };
    });

    const issues = [];
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      if (!t.undersized) continue;
      if (isInlineTextException(t.el, t.style)) continue;
      if (isNativeUnstyledControl(t.el, t.style)) continue;

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
          code: 'TARGET_COLLISION',
          criterion: '2.5.8',
          level: 'AA',
          severity: 'fail',
          title: 'Target Size (Minimum) < 24x24 CSS px with spacing collision',
          elementLabel: getSnippetText(t.el),
          selector: getReadableSelector(t.el),
          params: { w, h, neighbor: collisions[0] },
          actual: `${w} x ${h} px — 24px circle intersects ${collisions[0]}`,
          fixCode: `min-width: 24px; min-height: 24px; padding: ${padY}px ${padX}px;`,
          bbox: { x: t.rect.left + window.scrollX, y: t.rect.top + window.scrollY, w: t.rect.width, h: t.rect.height }
        });
      } else {
        issues.push({
          code: 'TARGET_SPACING_PASS',
          criterion: '2.5.8',
          level: 'AA-spacing',
          severity: 'warning',
          title: 'Undersized target (< 24x24 px) relies on spacing exception',
          elementLabel: getSnippetText(t.el),
          selector: getReadableSelector(t.el),
          params: { w, h },
          actual: `${w} x ${h} px (passes via 24px circle spacing)`,
          fixCode: `min-width: 24px; min-height: 24px;`,
          bbox: { x: t.rect.left + window.scrollX, y: t.rect.top + window.scrollY, w: t.rect.width, h: t.rect.height }
        });
      }
    }
    return { issues, checkedCount: targets.length };
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

  function auditFocusNotObscured2411(maxNodes = 150) {
    const prevScrollX = window.scrollX;
    const prevScrollY = window.scrollY;
    const prevActive = document.activeElement;

    const hudEl = document.getElementById(HUD_ID);
    const prevHudDisplay = hudEl ? hudEl.style.display : '';
    if (hudEl) hudEl.style.display = 'none';

    const focusables = Array.from(document.querySelectorAll(FOCUSABLE_SELECTOR))
      .filter(el => isElementRendered(el) && el.tabIndex >= 0)
      .slice(0, maxNodes);

    const issues = [];

    for (const el of focusables) {
      try {
        el.focus({ preventScroll: false });
      } catch (_) {
        continue;
      }

      const r = el.getBoundingClientRect();
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

          // Only count genuine fixed/sticky/high-z overlay layers per W3C F110
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
          code: 'FOCUS_OBSCURED_FULL',
          criterion: '2.4.11',
          level: 'AA',
          severity: 'fail',
          title: 'Focused element is 100% obscured by sticky/fixed overlay (F110)',
          elementLabel: getSnippetText(el),
          selector: getReadableSelector(el),
          params: { blocker: blockerSel, blockerH, coveredPts: 9 },
          actual: `100% hidden behind ${blockerSel} (${blockerH}px height)`,
          fixCode: `html { scroll-padding-top: ${Math.ceil(blockerH + 16)}px; }`,
          bbox: { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }
        });
      } else if (unobscuredCount > 0 && unobscuredCount < 9 && overlayBlocker) {
        const blockerSel = getReadableSelector(overlayBlocker);
        const coveredPts = 9 - unobscuredCount;
        issues.push({
          code: 'FOCUS_OBSCURED_PARTIAL',
          criterion: '2.4.11',
          level: 'AAA-warn',
          severity: 'warning',
          title: `Focused element is partially obscured (${coveredPts}/9 points covered)`,
          elementLabel: getSnippetText(el),
          selector: getReadableSelector(el),
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
    return { issues, checkedCount: focusables.length };
  }

  function auditAccessibleAuth338() {
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
          code: 'AUTH_PASTE_BLOCKED',
          criterion: '3.3.8',
          level: 'AA',
          severity: 'fail',
          title: 'Credential field blocks clipboard paste (breaks password managers)',
          elementLabel: getSnippetText(input),
          selector: getReadableSelector(input),
          params: {},
          actual: 'paste event cancelled via preventDefault() or inline onpaste',
          fixCode: 'Remove paste event blockers and set autocomplete="current-password".',
          bbox: { x: rect.left + window.scrollX, y: rect.top + window.scrollY, w: rect.width, h: rect.height }
        });
      }

      if ((input.getAttribute('autocomplete') || '').toLowerCase() === 'off') {
        issues.push({
          code: 'AUTH_AUTOCOMPLETE_OFF',
          criterion: '3.3.8',
          level: 'AA',
          severity: 'warning',
          title: 'Credential field disables autofill (autocomplete="off")',
          elementLabel: getSnippetText(input),
          selector: getReadableSelector(input),
          params: {},
          actual: 'autocomplete="off" on authentication input',
          fixCode: 'autocomplete="current-password"',
          bbox: { x: rect.left + window.scrollX, y: rect.top + window.scrollY, w: rect.width, h: rect.height }
        });
      }
    }
    return { issues, checkedCount: authInputs.length };
  }

  function auditDraggingCandidates257() {
    const dragSelectors = '[draggable="true"], [role="slider"], [data-rbd-draggable-id], .swiper-wrapper, .sortable';
    const els = Array.from(document.querySelectorAll(dragSelectors)).filter(isElementRendered);
    const issues = els.map(el => {
      const rect = el.getBoundingClientRect();
      return {
        code: 'DRAG_MANUAL_CHECK',
        criterion: '2.5.7',
        level: 'AA',
        severity: 'manual',
        title: 'Verify single-pointer (click/tap) alternative for draggable / slider control',
        elementLabel: getSnippetText(el),
        selector: getReadableSelector(el),
        params: { tag: el.tagName.toLowerCase() },
        actual: `Interactive drag/slider widget (${el.tagName.toLowerCase()})`,
        fixCode: 'Provide explicit Step +/-, Prev/Next buttons, or tap input alongside drag.',
        bbox: { x: rect.left + window.scrollX, y: rect.top + window.scrollY, w: rect.width, h: rect.height }
      };
    });
    return { issues, checkedCount: els.length };
  }

  function renderShadowHud(issues, showWarnings = false) {
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

    const style = document.createElement('style');
    style.textContent = `
      .box {
        position: absolute;
        box-sizing: border-box;
        pointer-events: none;
        border-radius: 3px;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .fails-only .box-warning,
      .fails-only .box-manual {
        display: none;
      }
      .box.force-show {
        display: block !important;
      }
      .box-fail { border: 2px solid #dc2626; background: rgba(220, 38, 38, 0.10); }
      .box-warning { border: 2px dashed #d97706; background: rgba(217, 119, 6, 0.08); }
      .box-manual { border: 2px dotted #2563eb; background: rgba(37, 99, 235, 0.08); }
      .badge {
        position: absolute;
        top: -18px;
        left: -2px;
        font: 600 10px/14px ui-monospace, SFMono-Regular, Menlo, monospace;
        color: #ffffff;
        padding: 1px 5px;
        border-radius: 3px;
        white-space: nowrap;
      }
      .box-fail .badge { background: #dc2626; }
      .box-warning .badge { background: #d97706; }
      .box-manual .badge { background: #2563eb; }
      .pulse {
        transform: scale(1.06);
        box-shadow: 0 0 0 6px rgba(220, 38, 38, 0.35);
      }
    `;
    shadow.appendChild(style);

    issues.forEach((issue, idx) => {
      if (!issue.bbox) return;
      const box = document.createElement('div');
      box.className = `box box-${issue.severity}`;
      box.dataset.idx = String(idx);
      box.style.left = `${Math.max(0, issue.bbox.x - 2)}px`;
      box.style.top = `${Math.max(0, issue.bbox.y - 2)}px`;
      box.style.width = `${Math.max(16, issue.bbox.w + 4)}px`;
      box.style.height = `${Math.max(16, issue.bbox.h + 4)}px`;

      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = `#${idx + 1} · ${issue.criterion}`;
      box.appendChild(badge);
      wrapper.appendChild(box);
    });

    shadow.appendChild(wrapper);
    document.documentElement.appendChild(host);
  }

  function runFullAudit() {
    const startedAt = performance.now();
    const r258 = auditTargetSize258();
    const r2411 = auditFocusNotObscured2411();
    const r338 = auditAccessibleAuth338();
    const r257 = auditDraggingCandidates257();

    const order = { fail: 0, warning: 1, manual: 2 };
    const allIssues = [
      ...r258.issues,
      ...r2411.issues,
      ...r338.issues,
      ...r257.issues
    ].sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));

    renderShadowHud(allIssues, Boolean(window.__wcag22ShowWarnings));

    const result = {
      url: window.location.href,
      pageTitle: document.title || window.location.hostname,
      scannedAt: new Date().toISOString(),
      durationMs: Math.round(performance.now() - startedAt),
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      counts: {
        fail: allIssues.filter(i => i.severity === 'fail').length,
        warning: allIssues.filter(i => i.severity === 'warning').length,
        manual: allIssues.filter(i => i.severity === 'manual').length,
        checkedNodes: r258.checkedCount + r2411.checkedCount + r338.checkedCount + r257.checkedCount
      },
      issues: allIssues
    };

    window.__wcag22LastAudit = result;
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
          const audit = window.__wcag22LastAudit;
          const item = audit && audit.issues[msg.index];
          if (item && item.bbox) {
            window.scrollTo({
              top: Math.max(0, item.bbox.y - window.innerHeight / 3),
              behavior: 'smooth'
            });
            const box = root && root.querySelector(`[data-idx="${msg.index}"]`);
            if (box) {
              box.classList.add('force-show', 'pulse');
              setTimeout(() => box.classList.remove('pulse'), 1100);
            }
          }
          sendResponse({ ok: true });
        } else if (msg.type === 'TOGGLE_HUD') {
          if (host) host.style.display = msg.visible ? 'block' : 'none';
          sendResponse({ ok: true });
        } else if (msg.type === 'SET_HUD_WARNINGS') {
          window.__wcag22ShowWarnings = Boolean(msg.showWarnings);
          if (root) {
            root.classList.toggle('fails-only', !window.__wcag22ShowWarnings);
          }
          sendResponse({ ok: true });
        } else if (msg.type === 'SCROLL_FOR_CROP') {
          const item = window.__wcag22LastAudit && window.__wcag22LastAudit.issues[msg.index];
          if (item && item.bbox) {
            // Isolate ONLY the target issue box so neighboring badges never overlap the screenshot crop!
            if (root) {
              root.querySelectorAll('.box').forEach(b => {
                b.style.display = b.dataset.idx === String(msg.index) ? 'block' : 'none';
              });
            }
            const targetScrollY = Math.max(0, item.bbox.y - Math.round(window.innerHeight / 3));
            window.scrollTo(0, targetScrollY);
            sendResponse({
              ok: true,
              viewportRect: {
                x: item.bbox.x - window.scrollX,
                y: item.bbox.y - window.scrollY,
                w: item.bbox.w,
                h: item.bbox.h,
                dpr: window.devicePixelRatio || 1
              }
            });
          } else {
            sendResponse({ ok: false });
          }
        } else if (msg.type === 'RESTORE_HUD_AFTER_CROP') {
          if (root) {
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
