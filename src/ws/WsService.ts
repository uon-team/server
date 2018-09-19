import { Injectable } from "@uon/core";
import { HttpUpgradeContext } from "../http/HttpUpgradeContext";


@Injectable()
export class WsService {


    constructor() {


    }


    upgrade(context: HttpUpgradeContext) {
        
        const req = context.request; 
        const version = +req.headers['sec-websocket-version'];
        const protocol = req.headers.upgrade.toLowerCase();
        const key = req.headers['sec-websocket-key'] as string;


        console.log(protocol, version, key);



    }
}