import * as Flex from '@twilio/flex-ui';

import { EncodedParams } from '../../../types/serverless';
import ApiService from '../../../utils/serverless/ApiService';

export interface SetWebhookandTimerResponse {
  dateInactive?: string
  message: string;
  status?: number;
  success?: boolean;
  webhookSid?: string;
}

class TaskColorHandlerService extends ApiService {
  async setWebhookAndTimerOnConversation(conversationSid: string): Promise<SetWebhookandTimerResponse> {
    try {
      return await this.#setWebhookAndTimer(conversationSid);
    } catch (error) {
      let errorMessage;
      let errorStatus: number = 400;

      if (typeof error === 'object' && error !== null) {
        errorMessage = (error as { message?: string }).message || JSON.stringify(error);
        errorStatus = (error as { status?: number }).status || 400;
      } else {
        errorMessage = String(error);
      }

      return {
        message: `Webhook and timer configuration in the conversation ${conversationSid} has failed due to the following error: ${errorMessage}`,
        success: false,
        status: errorStatus
      };
    }
  }

  #setWebhookAndTimer = async (conversationSid: string): Promise<SetWebhookandTimerResponse> => {
    const manager = Flex.Manager.getInstance();

    const encodedParams: EncodedParams = {
      Token: encodeURIComponent(manager.user.token),
      conversationSid: encodeURIComponent(conversationSid),
    };

    return this.fetchJsonWithReject<SetWebhookandTimerResponse>(
      `${this.serverlessProtocol}://${this.serverlessDomain}/features/task-color-handler/flex/set-webhook-and-timer`,
      {
        method: 'post',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: this.buildBody(encodedParams),
      },
    ).then((response): SetWebhookandTimerResponse => {
      return {
        ...response,
      };
    });
  };
}

export default new TaskColorHandlerService();
