/**
 * Built-in Normative Legal & Technical Requirements Knowledge Base (v1.1.0)
 * Maps W3C WCAG 2.2 Level A/AA criteria to:
 *  1) Harmonised European Standard ETSI EN 301 549 V4.1.1 (2026-09) Clause 9 (Web) & Annex ZA
 *  2) European Accessibility Act — Directive (EU) 2019/882 (CELEX:32019L0882) Articles & Annex I/IV/V
 *  3) National EU transpositions (Germany BFSG / BFSGV, France RGAA, EU E-Commerce Art. 2(2)(f))
 */
(() => {
  const NORMATIVE_DB = {
    registryVersion: '2026.11.1',
    releasedAt: '2026-11-18',
    standards: {
      wcag: {
        name: 'W3C WCAG 2.2 (ISO/IEC 40500:2025)',
        url: 'https://www.w3.org/TR/WCAG22/',
        jsonFeed: 'https://raw.githubusercontent.com/w3c/wcag/main/11ty/json/wcag.json'
      },
      en301549: {
        name: 'ETSI EN 301 549 V4.1.1 (2026-09)',
        url: 'https://www.etsi.org/deliver/etsi_en/301500_301599/301549/04.01.01_60/en_301549v040101p.pdf'
      },
      eaa: {
        name: 'Directive (EU) 2019/882 (European Accessibility Act)',
        url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32019L0882'
      }
    },
    clauses: {
      '1.1.1': {
        wcag: 'SC 1.1.1',
        level: 'A',
        principle: 'perceivable',
        enClause: 'EN 301 549 Clause 9.1.1.1',
        eaaArticle: 'Directive (EU) 2019/882, Annex I, Sec. III(c) & Sec. IV(g)',
        nationalRef: 'BFSG § 3 Abs. 2 · Annex ZA Table ZA.1',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html',
        legalNote: {
          ru: 'EN 301 549 п. 9.1.1.1 · Директива (ЕС) 2019/882 Прил. I Разд. III(c) (Текстовые альтернативы нетекстового контента)',
          en: 'EN 301 549 Clause 9.1.1.1 · Directive (EU) 2019/882 Annex I Sec. III(c) (Non-text Content)',
          de: 'EN 301 549 Abschn. 9.1.1.1 · Richtlinie (EU) 2019/882 Anh. I Abschn. III(c) · BFSG § 3 (Nicht-Text-Inhalt)'
        }
      },
      '1.3.1': {
        wcag: 'SC 1.3.1',
        level: 'A',
        principle: 'perceivable',
        enClause: 'EN 301 549 Clause 9.1.3.1',
        eaaArticle: 'Directive (EU) 2019/882, Annex I, Sec. III(c)',
        nationalRef: 'BFSG § 3 Abs. 2 · Annex ZA Table ZA.1',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html',
        legalNote: {
          ru: 'EN 301 549 п. 9.1.3.1 · Директива (ЕС) 2019/882 Прил. I Разд. III(c) (Семантическая структура и связи)',
          en: 'EN 301 549 Clause 9.1.3.1 · Directive (EU) 2019/882 Annex I Sec. III(c) (Info & Relationships)',
          de: 'EN 301 549 Abschn. 9.1.3.1 · Richtlinie (EU) 2019/882 Anh. I · BFSG § 3 (Info und Beziehungen)'
        }
      },
      '1.4.3': {
        wcag: 'SC 1.4.3',
        level: 'AA',
        principle: 'perceivable',
        enClause: 'EN 301 549 Clause 9.1.4.3',
        eaaArticle: 'Directive (EU) 2019/882, Annex I, Sec. I(2)(b) & Sec. III(c)',
        nationalRef: 'BFSG § 3 Abs. 2 · Annex ZA Table ZA.1',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html',
        legalNote: {
          ru: 'EN 301 549 п. 9.1.4.3 · Директива (ЕС) 2019/882 Прил. I Разд. I(2)(b) и III(c) (Минимальный контраст текста ≥ 4.5:1)',
          en: 'EN 301 549 Clause 9.1.4.3 · Directive (EU) 2019/882 Annex I Sec. I(2)(b) & III(c) (Minimum Contrast ≥ 4.5:1)',
          de: 'EN 301 549 Abschn. 9.1.4.3 · Richtlinie (EU) 2019/882 Anh. I · BFSG § 3 (Kontrast Minimum ≥ 4.5:1)'
        }
      },
      '2.4.3': {
        wcag: 'SC 2.4.3',
        level: 'A',
        principle: 'operable',
        enClause: 'EN 301 549 Clause 9.2.4.3',
        eaaArticle: 'Directive (EU) 2019/882, Annex I, Sec. III(c)',
        nationalRef: 'BFSG § 3 Abs. 2',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html',
        legalNote: {
          ru: 'EN 301 549 п. 9.2.4.3 · Директива (ЕС) 2019/882 Прил. I Разд. III(c) (Логический порядок фокуса клавиатуры)',
          en: 'EN 301 549 Clause 9.2.4.3 · Directive (EU) 2019/882 Annex I Sec. III(c) (Focus Order)',
          de: 'EN 301 549 Abschn. 9.2.4.3 · Richtlinie (EU) 2019/882 Anh. I · BFSG § 3 (Fokus-Reihenfolge)'
        }
      },
      '2.4.4': {
        wcag: 'SC 2.4.4',
        level: 'A',
        principle: 'operable',
        enClause: 'EN 301 549 Clause 9.2.4.4',
        eaaArticle: 'Directive (EU) 2019/882, Annex I, Sec. III(c)',
        nationalRef: 'BFSG § 3 Abs. 2',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html',
        legalNote: {
          ru: 'EN 301 549 п. 9.2.4.4 · Директива (ЕС) 2019/882 Прил. I Разд. III(c) (Понятное назначение ссылки)',
          en: 'EN 301 549 Clause 9.2.4.4 · Directive (EU) 2019/882 Annex I Sec. III(c) (Link Purpose in Context)',
          de: 'EN 301 549 Abschn. 9.2.4.4 · Richtlinie (EU) 2019/882 Anh. I · BFSG § 3 (Linkzweck im Kontext)'
        }
      },
      '2.4.7': {
        wcag: 'SC 2.4.7',
        level: 'AA',
        principle: 'operable',
        enClause: 'EN 301 549 Clause 9.2.4.7',
        eaaArticle: 'Directive (EU) 2019/882, Annex I, Sec. III(c)',
        nationalRef: 'BFSG § 3 Abs. 2',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html',
        legalNote: {
          ru: 'EN 301 549 п. 9.2.4.7 · Директива (ЕС) 2019/882 Прил. I Разд. III(c) (Видимый индикатор фокуса клавиатуры)',
          en: 'EN 301 549 Clause 9.2.4.7 · Directive (EU) 2019/882 Annex I Sec. III(c) (Focus Visible)',
          de: 'EN 301 549 Abschn. 9.2.4.7 · Richtlinie (EU) 2019/882 Anh. I · BFSG § 3 (Fokus sichtbar)'
        }
      },
      '2.4.11': {
        wcag: 'SC 2.4.11',
        level: 'AA',
        principle: 'operable',
        enClause: 'EN 301 549 V4.1.1 Clause 9.2.4.11',
        eaaArticle: 'Directive (EU) 2019/882, Annex I, Sec. III(c)',
        nationalRef: 'BFSG § 3 Abs. 2 · WCAG 2.2 New AA',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html',
        legalNote: {
          ru: 'EN 301 549 V4.1.1 п. 9.2.4.11 · Директива (ЕС) 2019/882 Прил. I Разд. III(c) (Фокус не перекрыт липкими панелями)',
          en: 'EN 301 549 V4.1.1 Clause 9.2.4.11 · Directive (EU) 2019/882 Annex I Sec. III(c) (Focus Not Obscured)',
          de: 'EN 301 549 V4.1.1 Abschn. 9.2.4.11 · Richtlinie (EU) 2019/882 Anh. I · BFSG § 3 (Fokus nicht verdeckt)'
        }
      },
      '2.4.13': {
        wcag: 'SC 2.4.13',
        level: 'AAA-Advisory',
        principle: 'operable',
        enClause: 'W3C WCAG 2.2 SC 2.4.13 (Advisory to EN 9.2.4.7)',
        eaaArticle: 'Directive (EU) 2019/882, Annex I, Sec. III(c)',
        nationalRef: 'Best-Practice Contrast ≥ 3:1',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html',
        legalNote: {
          ru: 'WCAG 2.2 SC 2.4.13 (в развитие EN 301 549 п. 9.2.4.7) — Контраст контура фокуса ≥ 3:1',
          en: 'WCAG 2.2 SC 2.4.13 (supporting EN 301 549 Clause 9.2.4.7) — Focus Appearance ≥ 3:1',
          de: 'WCAG 2.2 SC 2.4.13 (ergänzend zu EN 301 549 Abschn. 9.2.4.7) — Fokus-Erscheinungsbild ≥ 3:1'
        }
      },
      '2.5.7': {
        wcag: 'SC 2.5.7',
        level: 'AA',
        principle: 'operable',
        enClause: 'EN 301 549 V4.1.1 Clause 9.2.5.7',
        eaaArticle: 'Directive (EU) 2019/882, Annex I, Sec. I(2)(c) & Sec. III(c)',
        nationalRef: 'BFSG § 3 Abs. 2 · WCAG 2.2 New AA',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html',
        legalNote: {
          ru: 'EN 301 549 V4.1.1 п. 9.2.5.7 · Директива (ЕС) 2019/882 Прил. I Разд. III(c) (Альтернатива перетаскиванию одиночным кликом)',
          en: 'EN 301 549 V4.1.1 Clause 9.2.5.7 · Directive (EU) 2019/882 Annex I Sec. III(c) (Dragging Movements)',
          de: 'EN 301 549 V4.1.1 Abschn. 9.2.5.7 · Richtlinie (EU) 2019/882 Anh. I · BFSG § 3 (Ziehbewegungen)'
        }
      },
      '2.5.8': {
        wcag: 'SC 2.5.8',
        level: 'AA',
        principle: 'operable',
        enClause: 'EN 301 549 V4.1.1 Clause 9.2.5.8',
        eaaArticle: 'Directive (EU) 2019/882, Annex I, Sec. I(2)(c)(i) & Sec. III(c)',
        nationalRef: 'BFSG § 3 Abs. 2 · WCAG 2.2 New AA',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html',
        legalNote: {
          ru: 'EN 301 549 V4.1.1 п. 9.2.5.8 · Директива (ЕС) 2019/882 Прил. I Разд. I(2)(c) и III(c) (Размер области нажатия ≥ 24×24 CSS px)',
          en: 'EN 301 549 V4.1.1 Clause 9.2.5.8 · Directive (EU) 2019/882 Annex I Sec. I(2)(c) & III(c) (Target Size Minimum ≥ 24×24 px)',
          de: 'EN 301 549 V4.1.1 Abschn. 9.2.5.8 · Richtlinie (EU) 2019/882 Anh. I · BFSG § 3 (Zielgröße Minimum ≥ 24×24 px)'
        }
      },
      '3.1.1': {
        wcag: 'SC 3.1.1',
        level: 'A',
        principle: 'understandable',
        enClause: 'EN 301 549 Clause 9.3.1.1',
        eaaArticle: 'Directive (EU) 2019/882, Annex I, Sec. III(c)',
        nationalRef: 'BFSG § 3 Abs. 2',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html',
        legalNote: {
          ru: 'EN 301 549 п. 9.3.1.1 · Директива (ЕС) 2019/882 Прил. I Разд. III(c) (Определение языка страницы для синтезаторов речи)',
          en: 'EN 301 549 Clause 9.3.1.1 · Directive (EU) 2019/882 Annex I Sec. III(c) (Language of Page)',
          de: 'EN 301 549 Abschn. 9.3.1.1 · Richtlinie (EU) 2019/882 Anh. I · BFSG § 3 (Sprache der Seite)'
        }
      },
      '3.2.6': {
        wcag: 'SC 3.2.6',
        level: 'A',
        principle: 'understandable',
        enClause: 'EN 301 549 V4.1.1 Clause 9.3.2.6',
        eaaArticle: 'Directive (EU) 2019/882, Art. 13 & Annex I, Sec. III(c)',
        nationalRef: 'BFSG § 3 Abs. 2 · WCAG 2.2 New A',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/consistent-help.html',
        legalNote: {
          ru: 'EN 301 549 V4.1.1 п. 9.3.2.6 · Директива (ЕС) 2019/882 Ст. 13 и Прил. I Разд. III(c) (Единообразное расположение контактов/помощи)',
          en: 'EN 301 549 V4.1.1 Clause 9.3.2.6 · Directive (EU) 2019/882 Art. 13 & Annex I Sec. III(c) (Consistent Help)',
          de: 'EN 301 549 V4.1.1 Abschn. 9.3.2.6 · Richtlinie (EU) 2019/882 Art. 13 · BFSG § 3 (Konsistente Hilfe)'
        }
      },
      '3.3.2': {
        wcag: 'SC 3.3.2',
        level: 'A',
        principle: 'understandable',
        enClause: 'EN 301 549 Clause 9.3.3.2',
        eaaArticle: 'Directive (EU) 2019/882, Annex I, Sec. III(c) & Sec. IV(g)',
        nationalRef: 'BFSG § 3 Abs. 2',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html',
        legalNote: {
          ru: 'EN 301 549 п. 9.3.3.2 · Директива (ЕС) 2019/882 Прил. I Разд. III(c) и IV(g) (Метки и подписи полей ввода форм)',
          en: 'EN 301 549 Clause 9.3.3.2 · Directive (EU) 2019/882 Annex I Sec. III(c) & IV(g) (Labels or Instructions)',
          de: 'EN 301 549 Abschn. 9.3.3.2 · Richtlinie (EU) 2019/882 Anh. I · BFSG § 3 (Beschriftungen oder Anweisungen)'
        }
      },
      '3.3.7': {
        wcag: 'SC 3.3.7',
        level: 'A',
        principle: 'understandable',
        enClause: 'EN 301 549 V4.1.1 Clause 9.3.3.7',
        eaaArticle: 'Directive (EU) 2019/882, Annex I, Sec. IV(g) (E-Commerce Checkout)',
        nationalRef: 'BFSG § 3 Abs. 2 · WCAG 2.2 New A',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html',
        legalNote: {
          ru: 'EN 301 549 V4.1.1 п. 9.3.3.7 · Директива (ЕС) 2019/882 Прил. I Разд. IV(g) (Запрет избыточного повторного ввода данных)',
          en: 'EN 301 549 V4.1.1 Clause 9.3.3.7 · Directive (EU) 2019/882 Annex I Sec. IV(g) (Redundant Entry)',
          de: 'EN 301 549 V4.1.1 Abschn. 9.3.3.7 · Richtlinie (EU) 2019/882 Anh. I Abschn. IV(g) · BFSG § 3 (Redundante Eingabe)'
        }
      },
      '3.3.8': {
        wcag: 'SC 3.3.8',
        level: 'AA',
        principle: 'understandable',
        enClause: 'EN 301 549 V4.1.1 Clause 9.3.3.8',
        eaaArticle: 'Directive (EU) 2019/882, Annex I, Sec. IV(g)(ii) (Identification, Security & Payment)',
        nationalRef: 'BFSG § 3 Abs. 2 · WCAG 2.2 New AA',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html',
        legalNote: {
          ru: 'EN 301 549 V4.1.1 п. 9.3.3.8 · Директива (ЕС) 2019/882 Прил. I Разд. IV(g)(ii) (Доступная идентификация, вход и оплата)',
          en: 'EN 301 549 V4.1.1 Clause 9.3.3.8 · Directive (EU) 2019/882 Annex I Sec. IV(g)(ii) (Accessible Authentication)',
          de: 'EN 301 549 V4.1.1 Abschn. 9.3.3.8 · Richtlinie (EU) 2019/882 Anh. I Abschn. IV(g)(ii) · BFSG § 3 (Zugängliche Authentifizierung)'
        }
      },
      '4.1.2': {
        wcag: 'SC 4.1.2',
        level: 'A',
        principle: 'robust',
        enClause: 'EN 301 549 Clause 9.4.1.2',
        eaaArticle: 'Directive (EU) 2019/882, Annex I, Sec. III(c)',
        nationalRef: 'BFSG § 3 Abs. 2 · Annex ZA Table ZA.1',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
        legalNote: {
          ru: 'EN 301 549 п. 9.4.1.2 · Директива (ЕС) 2019/882 Прил. I Разд. III(c) (Программное имя, роль и состояние элемента для скринридера)',
          en: 'EN 301 549 Clause 9.4.1.2 · Directive (EU) 2019/882 Annex I Sec. III(c) (Name, Role, Value)',
          de: 'EN 301 549 Abschn. 9.4.1.2 · Richtlinie (EU) 2019/882 Anh. I · BFSG § 3 (Name, Rolle, Wert)'
        }
      },
      'EN 301 549': {
        wcag: 'EN 301 549 Cl. 9.6',
        level: 'EAA',
        principle: 'robust',
        enClause: 'EN 301 549 V4.1.1 Clause 9.6 & Clause 5.2',
        eaaArticle: 'Directive (EU) 2019/882, Art. 13(4) & Art. 15 (Presumption of Conformity)',
        nationalRef: 'EDF / IAAP Regulatory Guidance on Overlays',
        url: 'https://www.edf-feph.org/accessibility-overlays-dont-guarantee-compliance-with-european-legislation/',
        legalNote: {
          ru: 'EN 301 549 п. 9.6 · Директива (ЕС) 2019/882 Ст. 13 и 15 (Запрет подмены соответствия кода поверхностными виджетами-оверлеями)',
          en: 'EN 301 549 Clause 9.6 · Directive (EU) 2019/882 Art. 13 & 15 (Source Code Conformance vs. Overlay Widgets)',
          de: 'EN 301 549 Abschn. 9.6 · Richtlinie (EU) 2019/882 Art. 13 & 15 · BFSG (Keine Konformität durch Overlay-Widgets)'
        }
      }
    }
  };

  function lookupClause(criterion, lang = 'ru') {
    const clean = String(criterion || '').replace(/^SC\s+/i, '').trim();
    const entry = NORMATIVE_DB.clauses[clean];
    if (!entry) {
      return {
        wcag: `SC ${clean}`,
        enClause: `EN 301 549 Clause 9.${clean}`,
        eaaArticle: 'Directive (EU) 2019/882, Annex I, Sec. III(c)',
        nationalRef: 'BFSG § 3',
        principle: 'operable',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/',
        citation: `EN 301 549 Clause 9.${clean} · Directive (EU) 2019/882 Annex I`
      };
    }
    return {
      ...entry,
      citation: entry.legalNote[lang] || entry.legalNote.en
    };
  }

  function applyRegistryOverrides(state) {
    if (!state || typeof state !== 'object') return;
    if (state.registryVersion) NORMATIVE_DB.registryVersion = state.registryVersion;
    if (state.releasedAt) NORMATIVE_DB.releasedAt = state.releasedAt;
    if (state.overrides && typeof state.overrides === 'object') {
      for (const [k, v] of Object.entries(state.overrides)) {
        if (NORMATIVE_DB.clauses[k]) {
          NORMATIVE_DB.clauses[k] = { ...NORMATIVE_DB.clauses[k], ...v };
        } else {
          NORMATIVE_DB.clauses[k] = v;
        }
      }
    }
  }

  globalThis.WCAG22_NORMATIVE_DB = {
    data: NORMATIVE_DB,
    lookupClause,
    applyRegistryOverrides
  };
})();
