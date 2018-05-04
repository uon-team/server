
import { Injectable, Inject } from '@uon/core';
import { LOCALE_CONFIG, LocaleConfig } from './LocaleConfig';



@Injectable()
export class LocalizationService {

    constructor(@Inject(LOCALE_CONFIG) config: LocaleConfig) {

    }
}