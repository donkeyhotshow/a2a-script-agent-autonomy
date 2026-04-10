import {requestService} from '../src/services/core/request/request.service.js';
import {logger} from '../src/utils/logger.js';

async function main() {
    try {
        const daysArg = process.argv[2];
        if (daysArg) {
            process.env.REQUESTS_RETENTION_DAYS = daysArg;
            logger.info(`Setting retention days to ${daysArg} from argument`);
        }

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
