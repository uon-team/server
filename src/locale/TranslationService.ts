
import { Injectable, Inject } from '@uon/core';
import { LOCALE_CONFIG, LocaleConfig } from './LocaleConfig';



@Injectable()
export class TranslationService {

    constructor(@Inject(LOCALE_CONFIG) config: LocaleConfig) {

    }



    translate(key: string, data?: any, lang?: string) {
        return key;
    }
}