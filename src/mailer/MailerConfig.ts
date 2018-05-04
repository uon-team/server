import { InjectionToken, Provider } from '@uon/core';


// the unique http config token
export const MAILER_CONFIG = new InjectionToken<MailerConfig>('Mailer Configuration');

/**
 * The http config options
 */
export interface MailerConfig {

   
    // the email address set in the FROM field
    from: string;

    // the maximum sending rate per minute
    maxSendRate?: number;


}