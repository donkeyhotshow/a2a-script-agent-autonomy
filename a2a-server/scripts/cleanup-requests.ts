import {requestService} from '../src/services/core/request/request.service.js';
import {logger} from '../src/utils/logger.js';

async function main() {
    try {
        logger.info('Starting manual request storage cleanup...');
        const stats = await requestService.cleanupStorage();
        logger.info('Cleanup complete:', stats);
        process.exit(0);
    } catch (err) {
        logger.error('Cleanup failed:', err);
        process.exit(1);
    }
}

main();
