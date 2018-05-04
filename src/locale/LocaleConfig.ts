import { InjectionToken, Provider } from '@uon/core';


// the unique locale config token
export const LOCALE_CONFIG = new InjectionToken<LocaleConfig>('Locale Configuration');


/**
 * The locale config
 */
export interface LocaleConfig {

}