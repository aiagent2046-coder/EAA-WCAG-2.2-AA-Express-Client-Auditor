/**
 * Offline-safe ExtPay.js compatible wrapper for local unpacked development & testing.
 * Run `./scripts/fetch_extpay.sh` before production packaging to pull upstream Glench/ExtPay dist/ExtPay.js.
 */
(function (globalScope) {
  function ExtPay(extensionId) {
    const paidListeners = [];

    async function readLocalState() {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const data = await chrome.storage.local.get(['extpay_dev_paid', 'proStatus']);
        const isPaid = Boolean(data.extpay_dev_paid || (data.proStatus && data.proStatus.paid));
        return {
          paid: isPaid,
          paidAt: isPaid ? new Date().toISOString() : null,
          email: (data.proStatus && data.proStatus.email) || null,
          plan: isPaid ? { nickname: (data.proStatus && data.proStatus.plan) || 'agency_monthly' } : null,
          installedAt: new Date().toISOString()
        };
      }
      return { paid: false, paidAt: null, email: null, plan: null };
    }

    return {
      extensionId,
      startBackground() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
          chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes.extpay_dev_paid && changes.extpay_dev_paid.newValue === true) {
              readLocalState().then(user => paidListeners.forEach(fn => fn(user)));
            }
          });
        }
      },
      async getUser() {
        return readLocalState();
      },
      openPaymentPage(planNickname) {
        const planQuery = planNickname ? `?plan=${encodeURIComponent(planNickname)}` : '';
        const url = `https://extensionpay.com/extension/${encodeURIComponent(extensionId)}/choose-plan${planQuery}`;
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
          chrome.tabs.create({ url });
        }
      },
      openLoginPage() {
        const url = `https://extensionpay.com/extension/${encodeURIComponent(extensionId)}/login`;
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
          chrome.tabs.create({ url });
        }
      },
      openTrialPage(period) {
        const url = `https://extensionpay.com/extension/${encodeURIComponent(extensionId)}/trial?period=${encodeURIComponent(period || '7d')}`;
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
          chrome.tabs.create({ url });
        }
      },
      onPaid: {
        addListener(callback) {
          if (typeof callback === 'function') paidListeners.push(callback);
        }
      }
    };
  }

  globalScope.ExtPay = ExtPay;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExtPay;
  }
})(typeof self !== 'undefined' ? self : window);
