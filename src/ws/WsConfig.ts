
import { InjectionToken } from '@uon/core';


export const WS_CONFIG = new InjectionToken<WsConfig>('WebSocket server configuration');


export interface WsConfig {
    useHttpServer?: boolean;
    messageFormat?: any;

}