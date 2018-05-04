

import { Injectable, Inject, Optional } from '@uon/core';
import { WsConfig, WS_CONFIG } from './WsConfig';
import { WsContext } from './WsContext';
import { HttpServer } from '../http/HttpServer';

import * as ws  from 'ws'

@Injectable()
export class WsServer {

    private _server: ws.Server;
    private _connected: WsContext[] = [];
   

    constructor(@Inject(WS_CONFIG) private config: WsConfig, 
        @Optional() private http: HttpServer) {


    }

    /**
     * Starts the websocket server and begin accepting upgrade requests
     */
    start() {

        let wss = this._server = new ws.Server({
            server: this.http.http
        });

        // start listening for upgrade requests
        wss.on('connection', (wsock, req) => {

            // TODO handle path

            // create a context
            let context = new WsContext(wsock, req);

            // add to the connected client list
            this.addClient(context);

          });

    }


    private addClient(context: WsContext) {

        let index = this._connected.indexOf(context);
        if(index === -1) {
            this._connected.push(context);

            context.on('close', () => {
                this.removeClient(context);
            });
        }
        
    }

    private removeClient(context: WsContext) {

        let index = this._connected.indexOf(context);
        if(index > -1) {
            // make sure we close the connection
            context.close();

            // remove from list
            this._connected = this._connected.splice(index, 1);
        }
    }


}