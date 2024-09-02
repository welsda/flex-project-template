import React from 'react';
import * as Flex from '@twilio/flex-ui';
import { FlexComponent } from '../../../../types/feature-loader';
import DynamicTaskListBaseItem from '../../custom-components/DynamicTaskListBaseItem';

export const componentName = FlexComponent.TaskListItem;
export const componentHook = function configTaskListBaseItemColor(flex: typeof Flex) {
  flex.TaskListItem.Content.add(<DynamicTaskListBaseItem key="dynamic-task-list-base-item" />, {
    if: (props) =>
      Flex.TaskHelper.isCBMTask(props.task) &&
      props.task.attributes &&
      props.task.attributes.color &&
      props.task.attributes.conversationSid &&
      props.task.status &&
      props.task.taskChannelUniqueName &&
      props.task.taskChannelUniqueName === 'chat',
  });
};
