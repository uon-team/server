import { HttpResponse } from './HttpResponse';



export abstract class HttpTransform {

    /**
     * Optional configure method
     * @param options 
     */
    configure(options: any): this {
        return this;
    }

    /**
     * Transforms a response object
     * 
     * Subclasses must implement this
     * @param response 
     */
    abstract transform(response: HttpResponse): any;

}