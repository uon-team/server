import { HttpResponse } from './HttpResponse';



export abstract class HttpTransform {

    abstract configure(options: any): this;

    abstract transform(response: HttpResponse): any;

}