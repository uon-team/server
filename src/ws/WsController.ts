import { InjectionToken, RouteInfo, Router, TypeDecorator, MakeTypeDecorator, FindMetadataOfType, META_ANNOTATIONS, Type, PropDecorator, MakePropertyDecorator, ModuleRef } from "@uon/core";


/**
 * Default WS router
 */
export const WS_ROUTER = new InjectionToken<Router<WsController, any>>("WS router to handle connection upgrade and messages");


export interface WsControllerLike {
    connect(): void;
    disconnect(): void;
}


export interface WsControllerDecorator {

    (meta: WsController): TypeDecorator;
    new(meta: WsController): WsController;

}

export const WsController: WsControllerDecorator = MakeTypeDecorator(
    "WsController",
    (meta: WsController) => meta,
    null,
    (cls: any, meta: WsController) => {

        // ensure controller has connect and disconnect methods
       /* if (typeof cls.prototype.connect !== 'function' ||
            typeof cls.prototype.disconnect !== 'function') {
            throw new Error(`WsController: decorated classes must implement WsControllerLike, ie. have a connect() and disconnect() method`);
        }*/


        // ensure parent is WsController decorated
        if (meta.parent) {

            let parent_ctrl = FindMetadataOfType(META_ANNOTATIONS, meta.parent, WsController);

            if (!parent_ctrl) {
                throw new Error(`WsController: parent was defined 
                with ${meta.parent.name} but doesn't have 
                WsController decorator`);
            }

        }

        // set default priority
        if (meta.priority === undefined) {
            meta.priority = 1000;
        }

        meta.type = cls;

    }
);

export interface WsController {

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

    /**
     * The class type
     */
    type?: Type<any>
}



export interface WsRouteDecorator {

    (meta: WsRoute): PropDecorator;
    new(meta: WsRoute): WsRoute;

}

/**
 * HttpRoute decorator for router endpoints 
 * @param meta 
 */
export const WsRoute: WsRouteDecorator = MakePropertyDecorator(
    "WsRoute",
    (meta: WsRoute) => meta,
    null,
    (cls: any, meta: WsRoute, key: any) => {
        // set the method key
        meta.key = key;
    }
)

export interface WsRoute {

    /**
     * The path regexp to test
     */
    path: string;

    /**
     * the method name, do not set this as it will be overridden
     */
    key?: string;


}



export class WsRouter extends Router<WsController, WsRoute> {

    constructor() {
        super(WsController, WsRoute, []);
    }

    static FromModuleRefs(moduleRefs: Map<Type<any>, ModuleRef<any>>) {

        let ctrls: WsController[] = [];

        for (let [module_type, module_ref] of moduleRefs) {

            let declarations = module_ref.module.declarations || [];

            for (let i = 0; i < declarations.length; ++i) {
                
                let ctrl: WsController = FindMetadataOfType(META_ANNOTATIONS, declarations[i], WsController);
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

        const root = new WsRouter();

        ctrls.forEach((c) => {
            root.add(c.type);
        });

        return root;

    }


}


