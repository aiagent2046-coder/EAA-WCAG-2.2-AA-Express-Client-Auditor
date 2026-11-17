let auditData = null;
let brandData = {};

function downloadBlob(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toMarkdown(audit, brand) {
  const lines = [
    `# WCAG 2.2 AA & EAA Compliance Audit — ${brand.clientName || audit.pageTitle}`,
    '',
    `- **Audited URL:** ${audit.url}`,
    `- **Prepared by:** ${brand.agencyName || 'Accessibility QA'}${brand.auditorContact ? ` (${brand.auditorContact})` : ''}`,
    `- **Date:** ${audit.scannedAt}`,
    `- **Viewport:** ${audit.viewport}`,
    `- **Summary:** ${audit.counts.fail} AA Violations · ${audit.counts.warning} Warnings · ${audit.counts.manual} Manual Checks`,
    '',
    '## Actionable Remediation Backlog',
    ''
  ];

  audit.issues.forEach((iss, idx) => {
    lines.push(`### ${idx + 1}. [SC ${iss.criterion} · ${iss.severity.toUpperCase()}] ${iss.title}`);
    lines.push(`- **Selector:** \`${iss.selector}\``);
    lines.push(`- **Observed:** ${iss.actual}`);
    lines.push(`- **Developer Fix:** \`${iss.fixCode}\``);
    lines.push('');
  });
  return lines.join('\n');
}

function csvEscape(val) {
  const s = String(val ?? '');
  return `"${s.replace(/"/g, '""')}"`;
}

function toCsv(audit) {
  const rows = [['Index', 'WCAG_Criterion', 'Severity', 'Title', 'Selector', 'Observed', 'Recommended_Fix']];
  audit.issues.forEach((iss, idx) => {
    rows.push([
      idx + 1,
      iss.criterion,
      iss.severity.toUpperCase(),
      iss.title,
      iss.selector,
      iss.actual,
      iss.fixCode
    ]);
  });
  return rows.map(r => r.map(csvEscape).join(',')).join('\n');
}

async function initReport() {
  const store = await chrome.storage.local.get(['latestAuditReport', 'agencyBrand']);
  auditData = store.latestAuditReport;
  brandData = store.agencyBrand || {};

  if (!auditData) {
    document.getElementById('findings-container').textContent = 'No audit report found in local storage. Run a scan from the extension popup first.';
    return;
  }

  if (brandData.logoDataUrl) {
    const logoEl = document.getElementById('rep-logo');
    logoEl.src = brandData.logoDataUrl;
    logoEl.hidden = false;
  }
  const agencyParts = [brandData.agencyName, brandData.auditorContact].filter(Boolean);
  if (agencyParts.length > 0) {
    document.getElementById('rep-agency').textContent = `Prepared by ${agencyParts.join(' · ')}`;
  }

  document.getElementById('rep-client').textContent = brandData.clientName || auditData.pageTitle || 'Web Property';
  document.getElementById('rep-url').textContent = auditData.url;
  document.getElementById('rep-date').textContent = new Date(auditData.scannedAt).toLocaleString();
  document.getElementById('rep-vp').textContent = auditData.viewport;

  document.getElementById('sum-fail').textContent = String(auditData.counts.fail);
  document.getElementById('sum-warn').textContent = String(auditData.counts.warning);
  document.getElementById('sum-manual').textContent = String(auditData.counts.manual);
  document.getElementById('sum-nodes').textContent = String(auditData.counts.checkedNodes);

  const verdict = document.getElementById('rep-verdict');
  if (auditData.counts.fail > 0) {
    verdict.textContent = `Action Required (${auditData.counts.fail} AA Fails)`;
    verdict.className = 'verdict-pill verdict-fail';
  } else {
    verdict.textContent = 'Passed Automated WCAG 2.2 Delta';
    verdict.className = 'verdict-pill verdict-pass';
  }

  const container = document.getElementById('findings-container');
  container.replaceChildren();

  const autoIssues = auditData.issues.filter(i => i.severity !== 'manual');
  if (autoIssues.length === 0) {
    const ok = document.createElement('p');
    ok.textContent = 'Zero automated WCAG 2.2 AA delta violations or warnings detected on this viewport.';
    container.appendChild(ok);
  } else {
    autoIssues.forEach((iss, i) => {
      const card = document.createElement('div');
      card.className = 'finding';

      const top = document.createElement('div');
      top.className = 'finding-top';
      const strong = document.createElement('strong');
      strong.textContent = `${i + 1}. ${iss.title}`;
      const tag = document.createElement('span');
      tag.className = `tag tag-${iss.severity}`;
      tag.textContent = `SC ${iss.criterion} · ${iss.severity.toUpperCase()}`;
      top.append(strong, tag);

      const body = document.createElement('div');
      body.className = 'finding-body';

      const details = document.createElement('div');
      const obs = document.createElement('div');
      obs.textContent = `Element: ${iss.elementLabel || 'control'} — ${iss.actual}`;
      const sel = document.createElement('div');
      sel.className = 'mono';
      sel.textContent = `Selector: ${iss.selector}`;
      const fix = document.createElement('div');
      fix.className = 'fix-box';
      fix.textContent = `Fix: ${iss.fixCode}`;
      details.append(obs, sel, fix);
      body.appendChild(details);

      if (iss.cropDataUrl) {
        const img = document.createElement('img');
        img.className = 'crop-img';
        img.src = iss.cropDataUrl;
        img.alt = `Screenshot crop for ${iss.selector}`;
        body.appendChild(img);
      }

      card.append(top, body);
      container.appendChild(card);
    });
  }

  const manualTbody = document.getElementById('manual-tbody');
  manualTbody.replaceChildren();
  const manualItems = [
    ...auditData.issues.filter(i => i.severity === 'manual'),
    {
      criterion: '3.2.6',
      selector: 'Global page layout',
      actual: 'Verify help/contact link or widget appears in consistent relative order across pages.'
    },
    {
      criterion: '3.3.7',
      selector: 'Multi-step forms',
      actual: 'Verify previously entered user data is auto-populated or selectable without re-typing.'
    }
  ];

  manualItems.forEach(m => {
    const tr = document.createElement('tr');
    const tdC = document.createElement('td');
    tdC.textContent = `SC ${m.criterion}`;
    const tdS = document.createElement('td');
    tdS.textContent = `${m.selector} — ${m.actual}`;
    const tdCheck = document.createElement('td');
    tdCheck.innerHTML = '<label><input type="checkbox"> Pass</label> &nbsp; <label><input type="checkbox"> Fail</label> &nbsp; <label><input type="checkbox"> N/A</label>';
    tr.append(tdC, tdS, tdCheck);
    manualTbody.appendChild(tr);
  });
}

document.getElementById('btn-print').addEventListener('click', () => window.print());
document.getElementById('btn-dl-md').addEventListener('click', () => {
  if (!auditData) return;
  downloadBlob('wcag22-audit-report.md', toMarkdown(auditData, brandData), 'text/markdown;charset=utf-8');
});
document.getElementById('btn-dl-csv').addEventListener('click', () => {
  if (!auditData) return;
  downloadBlob('wcag22-jira-tickets.csv', toCsv(auditData), 'text/csv;charset=utf-8');
});

initReport();
