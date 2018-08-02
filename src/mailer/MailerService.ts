import { Injectable, Inject } from '@uon/core'
import { MAILER_CONFIG, MailerConfig, MailerAdpater } from './MailerConfig';
import { EmailMessage } from './EmailMessage';



@Injectable()
export class MailerService {


    constructor(@Inject(MAILER_CONFIG) private config: MailerConfig) {

    }

    send(message: EmailMessage, adapter: MailerAdpater) {

        return adapter.sendRaw(message.render());

    }


}



