import { HttpResponse } from './HttpResponse';



export abstract class HttpTransform {

    abstract configure(options: any): void;

    abstract transform(response: HttpResponse): any;

}