
import { Injector, EventSource } from "@uon/core";
import { HttpContext } from "../http/HttpContext";

import * as WebSocket from 'ws';
import { IncomingMessage } from "http";

export class WsContext extends EventSource {

    private _injector: Injector;

    private _closed: boolean = false;

    constructor(private _wsocket: WebSocket,
        private _request: IncomingMessage) {

        super();

        this.bindEvents();

    }

    /**
     * Sends a message to the other side
     * @param data 
     */
    send(data: string | Buffer) {

    }


    /**
     * Closes the connection
     */
    close() {

        // ignore if already closed
        if (this._closed) {
            return;
        }

        this._closed = true;
        this._wsocket.close();

    }

    private onMessage(message: string) {
        console.log('received: %s', message);

        this._wsocket.send('received ' + message);
        this.emit('message', message);
    }

    private onClose() {

        this._closed = true;

        console.log('closed web socket');

        this.emit('close');
    }

    private onOpen() {
        this.emit('open');
    }

    private bindEvents() {

        let ws = this._wsocket;

        ws.on('open', this.onOpen.bind(this));
        ws.on('close', this.onClose.bind(this));
        ws.on('message', this.onMessage.bind(this));

    }



}