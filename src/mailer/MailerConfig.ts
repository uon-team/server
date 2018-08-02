import { InjectionToken, Provider } from '@uon/core';


// the unique http config token
export const MAILER_CONFIG = new InjectionToken<MailerConfig>('Mailer Configuration');


/**
 * Adapters must implement this interface
 */
export interface MailerAdpater {

    /**
     * Send a pre-formatted email
     * @param buffer 
     */
    sendRaw(buffer: Buffer): any;
}



/**
 * The http config options
 */
export interface MailerConfig {


    // the email address set in the FROM field can be in the format '"John Doe" <john@doe.com>'
    from: string;

    // the maximum sending rate per minute
    maxSendRate?: number;


}