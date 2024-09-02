import * as Flex from '@twilio/flex-ui';
import { Conversation } from '@twilio/conversations';
import { FlexJsClient, ConversationEvent } from '../../../../../types/feature-loader';
import TaskColorHandlerService from '../../../utils/TaskColorHandlerService';

export const clientName = FlexJsClient.conversationsClient;
export const eventName = ConversationEvent.conversationJoined;
export const jsClientHook = async function setTaskSidOnChannelAttributes(
  _flex: typeof Flex,
  _manager: Flex.Manager,
  conversation: Conversation,
) {
  const task = Flex.TaskHelper.getTaskFromConversationSid(conversation.sid);

  if (!conversation || !task || !Flex.TaskHelper.isCBMTask(task)) {
    return;
  }

  const { attributes: taskAttributes, taskSid, taskChannelUniqueName } = task;
  const { originalDateCreated } = taskAttributes;
  const { sid: conversationSid } = conversation;

  if (conversationSid && originalDateCreated && taskAttributes && taskChannelUniqueName === 'chat') {
    try {
      const formattedOriginalDateCreated = new Date(originalDateCreated);
      const now = new Date();
      const timeDifference = (now.getTime() - formattedOriginalDateCreated.getTime()) / 1000 / 60;
      let color: string;

      if (timeDifference > 1 && timeDifference <= 2) {
        color = 'yellow';
      } else if (timeDifference > 2) {
        color = 'red';
      } else {
        color = 'green';
      }

      await task.setAttributes({ ...taskAttributes, color, taskSid });
      console.log(`The color attribute has been succesfully configured in the attributes of the task ${taskSid}`);
    } catch (error) {
      console.error(
        `The following error has occured while configuring the color attribute in the task ${taskSid}: ${error}`,
      );
      return;
    }

    const { attributes: conversationAttributes } = conversation;
    const { existingTaskSids, existingWebhookSid } = conversationAttributes as {
      existingTaskSids?: string[];
      existingWebhookSid?: string;
    };
    let newWebhookSid: string = '';

    if (!existingWebhookSid) {
      try {
        const { message, status, success, webhookSid } = await TaskColorHandlerService.setWebhookAndTimerOnConversation(
          conversationSid,
        );

        if (success && webhookSid) {
          newWebhookSid = webhookSid;
          console.log(message);
        } else if (status && status === 409) {
          console.warn(message);
        } else {
          console.error(message);
          return;
        }
      } catch (error) {
        console.error(
          `The following error has occurred while configuring a webhook and an inactivation timer in the conversation ${conversationSid}: ${error}`,
        );
        return;
      }
    }

    try {
      const newAttributes = {
        ...(typeof conversationAttributes === 'object' && conversationAttributes !== null
          ? conversationAttributes
          : {}),
        existingTaskSids: Array.isArray(existingTaskSids) ? [...existingTaskSids, taskSid] : [taskSid],
        existingWebhookSid: existingWebhookSid || newWebhookSid,
      };

      await conversation.updateAttributes(newAttributes);
      console.log(
        `The task SID ${taskSid} and the webhook SID ${existingWebhookSid} have been succesfully configured in the attributes of the conversation ${conversationSid}!`,
      );
    } catch (error) {
      console.error(
        `The following error has occured while configuring the task and webhook SIDs in the attributes of the conversation ${conversationSid}: ${error}`,
      );
    }
  }
};
