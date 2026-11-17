import { startOffscreenServer } from '@monetize.software/sdk-extension/offscreen';
import { PAYWALL_CONFIG } from '../paywall/config.js';

startOffscreenServer(PAYWALL_CONFIG);
