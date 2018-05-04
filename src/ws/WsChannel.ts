

import { WsServer } from './WsServer';


/**
 * 
 */
export class WsChannel {

    readonly id: string;

    private _sessions: any[];

    constructor(id: string, server: WsServer) {
        this.id = id;
    }



}