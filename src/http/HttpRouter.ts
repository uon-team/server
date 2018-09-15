
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


export const HTTP_ROUTER = new InjectionToken<Router<HttpRouter>>("Default Http router");

export const HTTP_REDIRECT_ROUTER = new InjectionToken<Router<HttpRouter>>("Http router to bypass https redirects")


export interface HttpRouterDecorator {

    (meta: HttpRouter): TypeDecorator;
    new(meta: HttpRouter): HttpRouter;

}

export const HttpRouter: HttpRouterDecorator = MakeTypeDecorator(
    "HttpRouter",
    (meta: HttpRouter) => meta,
    null,
    (cls: any, meta: HttpRouter) => {

        // ensure parent is HttpRouter decorated
        if (meta.parent) {

            let parent_ctrl = FindMetadataOfType(META_ANNOTATIONS, meta.parent, HttpRouter);

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

export interface HttpRouter {

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
    path?: string;

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
export class HttpRouterImpl extends Router<HttpRouter> {

    constructor() {
        super([MatchMethodFunc]);
    }


    add(type: Type<any>, moduleRef?: ModuleRef<any>) {

        let properties = GetMetadata(META_PROPERTIES, type.prototype) || EMPTY_OBJECT;
        let ctrl: HttpRouter = FindMetadataOfType(META_ANNOTATIONS, type, HttpRouter);

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

                let rbase: HttpRouterImpl = this;

                // find parent if needed
                if (ctrl.parent) {

                    for (let j = 0; j < this.records.length; ++j) {

                        if (this.records[j].route.type === ctrl.parent) {
                            rbase = this.records[j].route.router as HttpRouterImpl;
                            break;
                        }
                    }

                    if (rbase === this) {
                        throw new Error(`Couldnt find parent with type ${ctrl.parent.name}. Make sure it has been added first.`);
                    }

                }

                let keys: string[] = [];
                let regex = PathUtils.pathToRegex(ctrl.path + '(.*)', keys);

                rbase.records.push({
                    route: {
                        type: type,
                        path: ctrl.path,
                        metadata: ctrl,
                        router: new HttpRouterImpl(),
                        routes: handlers,
                        module: moduleRef
                    },
                    regex: regex
                });
            }
        }

        this.sort((a, b) => {
            return a.route.metadata.priority - b.route.metadata.priority;
        });


    }

    static FromModuleRefs(moduleRefs: Map<Type<any>, ModuleRef<any>>) {

        let ctrls: HttpRouter[] = [];

        for (let [module_type, module_ref] of moduleRefs) {

            let declarations = module_ref.module.declarations || EMPTY_ARRAY;

            for (let i = 0; i < declarations.length; ++i) {
                
                let ctrl: HttpRouter = FindMetadataOfType(META_ANNOTATIONS, declarations[i], HttpRouter);
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

        const root = new HttpRouterImpl();

        ctrls.forEach((c) => {
            root.add(c.type);
        });

        return root;

    }




}




const EMPTY_OBJECT: any = {};
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