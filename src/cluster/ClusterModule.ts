import { Module, ModuleWithProviders, APP_INITIALIZER } from "@uon/core";
import { ClusterService } from "./ClusterService";
import { ClusterConfig, CLUSTER_CONFIG, CLUSTER_DEFAULT_CONFIG } from "./ClusterConfig";



@Module({

    providers: [ 
        ClusterService,
        {
            token: APP_INITIALIZER,
            factory: (service: ClusterService) => {
                return service.start();
            },
            deps: [ClusterService],
            multi: true
        }

    ]
})
export class ClusterModule {


    static WithConfig(config: ClusterConfig): ModuleWithProviders {

        let merged = Object.assign({}, CLUSTER_DEFAULT_CONFIG, config);

        return {
            module: ClusterModule,
            providers: [
                {
                    token: CLUSTER_CONFIG,
                    value: merged
                }
            ]
        };
    }
}