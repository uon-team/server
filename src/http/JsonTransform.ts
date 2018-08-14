



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

/**
 * Configures a response to send a JSON object as a stream
 */
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

            let payload = this.payload;
            if(this.config.keep) {
                payload = FilterKeys(this.payload, this.config.keep);
            }

            result = JSON.stringify(payload, null, this.config.pretty ? '\t' : null);
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


function FilterKeys(obj: any, keys: string[]) {

    // filter unwanted keys
    let result: any = {};

    for (let i = 0; i < keys.length; ++i) {
        result[keys[i]] = obj[keys[i]];
    }

    return result;

}