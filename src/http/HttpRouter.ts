
import {
    Type,
    ModuleRef,
    GetMetadata,
    FindMetadataOfType,
    Router,
    RouterInfo,
    RouteInfo,
    Injectable,
    InjectionToken,
    PathUtils,
    META_ANNOTATIONS,
    META_PROPERTIES,
    TypeDecorator,
    PropDecorator,
    MakeTypeDecorator,
    MakePropertyDecorator
} from '@uon/core';


export const HTTP_ROUTER = new InjectionToken<Router<HttpController, HttpRoute>>("Default Http router");
export const HTTP_REDIRECT_ROUTER = new InjectionToken<Router<HttpController, HttpRoute>>("Http router to bypass https redirects")


export interface HttpControllerDecorator {

    (meta: HttpController): TypeDecorator;
    new(meta: HttpController): HttpController;

}

export const HttpController: HttpControllerDecorator = MakeTypeDecorator(
    "HttpRouter",
    (meta: HttpController) => meta,
    null,
    (cls: any, meta: HttpController) => {

        // ensure parent is HttpRouter decorated
        if (meta.parent) {

            let parent_ctrl = FindMetadataOfType(META_ANNOTATIONS, meta.parent, HttpController);

            if (!parent_ctrl) {
                throw new Error(`HttpRouter: parent was defined 
                with ${meta.parent.name} but doesn't have 
                HttpRouter decorator`);
            }

        }

        // set default priority
        if (meta.priority === undefined) {
            meta.priority = 1000;
        }

        meta.type = cls;

    }
);

export interface HttpController {

    /**
     * optional router name
     */
    name?: string;

    /**
     * the router's parent router
     */
    parent?: Type<any>;

    /**
     * the base path for route handling
     */
    path: string;

    /**
     * the order in which the routers are executed
     * lower numbers have priority, defaults to 1000
     */
    priority?: number;


    type?: Type<any>
}




export interface HttpRouteDecorator {

    (meta: HttpRoute): PropDecorator;
    new(meta: HttpRoute): HttpRoute;

}

/**
 * HttpRoute decorator for router endpoints 
 * @param meta 
 */
export const HttpRoute: HttpRouteDecorator = MakePropertyDecorator(
    "HttpRoute",
    (meta: HttpRoute) => meta,
    null,
    (cls: any, meta: HttpRoute, key: any) => {
        // set the method key
        meta.key = key;
    }
)

export interface HttpRoute {

    /**
     * an HTTP method, can be an array
     */
    method?: string | string[];

    /**
     * The path regexp to test
     */
    path: string;

    /**
     * the method name, do not set this as it with be overridden
     */
    key?: string;


}





/**
 * Implementation of Router for http
 */
export class HttpRouter extends Router<HttpController, HttpRoute> { 

    constructor() {
        super(HttpController, HttpRoute, [MatchMethodFunc]);
    }


    static FromModuleRefs(moduleRefs: Map<Type<any>, ModuleRef<any>>) {

        let ctrls: HttpController[] = [];

        for (let [module_type, module_ref] of moduleRefs) {

            let declarations = module_ref.module.declarations || EMPTY_ARRAY;

            for (let i = 0; i < declarations.length; ++i) {
                
                let ctrl: HttpController = FindMetadataOfType(META_ANNOTATIONS, declarations[i], HttpController);
                if(ctrl) {
                    ctrls.push(ctrl);
                }
            }
        }

        ctrls.sort((a, b) => {

            if (!a.parent) return -1;
            if (!b.parent) return 1;
    
            if (a.parent === b.type) return 1;
            if (b.parent === a.type) return -1;
    
            return 0;
        });

        const root = new HttpRouter();

        ctrls.forEach((c) => {
            root.add(c.type);
        });

        return root;

    }




}



const EMPTY_ARRAY: any[] = [];


function MatchMethodFunc(ri: RouteInfo<HttpRoute>, d: any) {

    if (!ri.metadata.method)
        return true;

    return ri.metadata.method.indexOf(d.method) > -1;
}




/**
 * Creates a Router hierachy from declarations in loaded application modules
 * @param refs 
 */
/*export function RouterFromModuleRefs(moduleRefs: Map<Type<any>, ModuleRef<any>>): Router<HttpRouter> {

    const root = CreateHttpRouter();
    const entries: RouterInfo<HttpRouter>[] = [];

    // go over all the loaded modules
    for (let [module_type, module_ref] of moduleRefs) {

        let declarations = module_ref.module.declarations || EMPTY_ARRAY;
        // go over all declaration

        for (let i = 0; i < declarations.length; ++i) {

            let decl_type = declarations[i];

            let properties = GetMetadata(META_PROPERTIES, decl_type.prototype) || EMPTY_OBJECT;
            let ctrl: HttpRouter = FindMetadataOfType(META_ANNOTATIONS, decl_type, HttpRouter);

            if (ctrl) {

                let handlers: RouteInfo<HttpRoute>[] = [];

                // go over all properties to find HttpRoutes
                for (let name in properties) {
                    if (Array.isArray(properties[name])) {
                        properties[name].forEach((p: any) => {
                            if (p instanceof HttpRoute) {

                                let h = p as HttpRoute;
                                let param_keys: string[] = [];

                                // build regex
                                let regex = PathUtils.pathToRegex(PathUtils.join(ctrl.path, h.path) || '/', param_keys);

                                handlers.push({
                                    regex: regex,
                                    metadata: h,
                                    keys: param_keys
                                });

                            }
                        });
                    }
                }


                // we only create an entry if path is defined
                if (ctrl.path) {
                    entries.push({
                        type: decl_type,
                        path: ctrl.path,
                        metadata: ctrl,
                        router: CreateHttpRouter(),
                        routes: handlers,
                        module: module_ref
                    });
                }
            }
        }

    }


    // we have to make sense of all those entries, add the orphan ctrl to the root router
    // but first let's sort all the entries
    entries.sort((a, b) => {

        if (!a.metadata.parent) return -1;
        if (!b.metadata.parent) return 1;

        if (a.metadata.parent === b.type) return 1;
        if (b.metadata.parent === a.type) return -1;

        return 0;
    });

    // do the magic
    for (let i = 0; i < entries.length; ++i) {
        let e = entries[i];

        let keys: string[] = [];
        let regex = PathUtils.pathToRegex(e.path + '(.*)', keys);

        if (!e.metadata.parent) {
            root.records.push({
                route: e,
                regex: regex
            });
        }
        else {

            // find parent entry
            let parent_entry: RouterInfo<HttpRouter> = null;
            for (let j = 0; j < entries.length; ++j) {

                if (entries[j].type === e.metadata.parent) {
                    parent_entry = entries[j];
                    break;
                }
            }

            if (!parent_entry) {
                throw new Error(`Couldnt find entry with type ${e.metadata.parent.name}. Check that it is in a module declarations.`);
            }

            parent_entry.router.records.push({
                route: e,
                regex: regex
            });
        }

    }

    // sort entries recursively
    root.sort((a, b) => {
        return a.route.metadata.priority - b.route.metadata.priority;
    });

    // all done here
    return root;
}*/