// @ts-ignore - Legacy module without types;
import {createDomainLogger} from '../../mcp/logger.js';
// @ts-ignore - Legacy module without types;
export {Logger, StructuredLogger, DomainLogger, createDomainLogger} from '../../mcp/logger.js';


export class LoggerFactory {
    static create(config: any) {
        return createDomainLogger(config);
    }
}
