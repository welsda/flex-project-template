import { useEffect } from 'react';
import { ITask } from '@twilio/flex-ui';

import { getDefaultColor } from '../../config';

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
      const siblingWithConversationSid = item.nextElementSibling as HTMLElement | null;
      const itemConversationSid = siblingWithConversationSid?.getAttribute('data-conversation-sid');
      const isCurrentConversationSid = itemConversationSid === conversationSid;

      if (isCurrentConversationSid) {
        const upperArea = item.querySelector('.Twilio-TaskListBaseItem-UpperArea');

        if (upperArea) {
          upperArea.setAttribute('style', `background: ${status === 'accepted' ? color : getDefaultColor()};`);
        }
      }
    });
  }, [color, status, conversationSid]);

  return <div data-conversation-sid={conversationSid} key={conversationSid}></div>;
};

export default DynamicTaskListBaseItem;
