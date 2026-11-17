import { AuthClient, BillingClient } from '@monetize.software/sdk/core';
import { attachGlobalPaywallBridge } from './create-bridge.js';

attachGlobalPaywallBridge({ AuthClient, BillingClient });
