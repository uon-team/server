



import { HttpTransform } from './HttpTransform';
import { HttpResponse } from './HttpResponse';
import { Readable } from 'stream';



export interface JsonTransformConfig {

    /**
     * list of property names to keep
     */
    keep?: string[];

    /**
     * Whether to print json with tab spaces
     */
    pretty?: boolean;
}

export class JsonTransform extends HttpTransform {

    constructor(private payload: any, private config: JsonTransformConfig = {}) {
        super();
    }

    transform(response: HttpResponse) {

        let result: string = null;
        if(typeof this.payload === 'string') {
            result = this.payload;
        }
        else {

            if(this.config.keep) {
                

            }

            result = JSON.stringify(this.payload, null, this.config.pretty ? '\t' : null);
        }
        
        // set content type to json
        response.setHeader('Content-Type', 'application/json');

        // maybe specify length?


        // create readable stream from json string
        let readable = new Readable();
        readable.push(result);
        readable.push(null);


        // stream response
        response.stream(readable);

    }
}