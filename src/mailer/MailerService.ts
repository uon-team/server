import { Injectable, Inject } from '@uon/core'
import { MAILER_CONFIG, MailerConfig } from './MailerConfig';



@Injectable()
export class MailerService {



    constructor(@Inject(MAILER_CONFIG) private config: MailerConfig) {

    }


}



