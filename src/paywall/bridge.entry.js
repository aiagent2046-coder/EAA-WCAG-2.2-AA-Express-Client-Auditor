import * as MonetizeSDK from '@monetize.software/sdk';
import { attachGlobalPaywallBridge } from './create-bridge.js';

attachGlobalPaywallBridge(MonetizeSDK);
