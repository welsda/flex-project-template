import * as Flex from '@twilio/flex-ui';
import { Conversation } from '@twilio/conversations';
import { FlexJsClient, ConversationEvent } from '../../../../../types/feature-loader';

export const clientName = FlexJsClient.conversationsClient;
export const eventName = ConversationEvent.conversationLeft;
export const jsClientHook = async function removeAuthorAndTaskSidFromChannelAttributes(
  _flex: typeof Flex,
  _manager: Flex.Manager,
  conversation: Conversation,
) {
  const task = Flex.TaskHelper.getTaskFromConversationSid(conversation.sid);

  if (!task || !Flex.TaskHelper.isCBMTask(task)) {
    return;
  }

  const { attributes: conversationAttributes, sid, state } = conversation;
  const { attributes: taskAttributes } = task;
  const { taskSid } = taskAttributes;

  if (state?.current !== 'closed') {
    const { existingTaskSids, ...newAttributes } = conversationAttributes as {
      existingTaskSids?: string[];
    };

    if (taskSid && Array.isArray(existingTaskSids) && existingTaskSids.includes(taskSid)) {
      try {
        const updatedTaskSids = existingTaskSids.filter((sid) => sid !== taskSid);

        if (updatedTaskSids.length > 0) {
          await conversation.updateAttributes({
            ...newAttributes,
            existingTaskSids: updatedTaskSids,
          });
        } else {
          await conversation.updateAttributes(newAttributes);
        }

        console.log(
          `The task SID ${taskSid} has been succesfully removed from the attributes of the conversation ${sid}!`,
        );
      } catch (error) {
        console.error(
          `The following error has occured while removing the task SID ${taskSid} from the attributes of the conversation ${sid}: ${error}`,
        );
      }
    }
  }
};
