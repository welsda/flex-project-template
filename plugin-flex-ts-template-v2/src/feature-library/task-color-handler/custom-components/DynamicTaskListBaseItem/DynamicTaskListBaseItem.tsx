import { useEffect } from 'react';
import { ITask } from '@twilio/flex-ui';

interface DynamicTaskListBaseItemProps {
  task: ITask;
}

const DynamicTaskListBaseItem = (props: DynamicTaskListBaseItemProps) => {
  const { task } = props;
  const { attributes, status } = task;
  const { color, conversationSid } = attributes;

  useEffect(() => {
    const taskListItems = document.querySelectorAll('.Twilio-TaskListBaseItem');

    taskListItems.forEach((item: Element) => {
      let itemConversationSid = item.getAttribute('data-conversationsid');

      if (!itemConversationSid) {
        item.setAttribute('data-conversationsid', conversationSid);
        itemConversationSid = conversationSid;
      }

      if (itemConversationSid === conversationSid) {
        const upperArea = item.querySelector('.Twilio-TaskListBaseItem-UpperArea');

        if (upperArea) {
          upperArea.setAttribute('style', `background: ${status !== 'accepted' ? '#E1E3EA' : color};`);
        }
      }
    });
  }, [color, status]);

  return null;
};

export default DynamicTaskListBaseItem;
