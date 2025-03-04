const { prepareActivatedByWebhookFunction, extractStandardResponse, twilioExecute } = require(Runtime.getFunctions()[
  'common/helpers/function-helper'
].path);

const requiredParameters = [
  { key: 'ConversationSid', purpose: 'conversation identifier' },
  { key: 'EventType', purpose: 'event responsible for triggering this function' },
];

exports.handler = prepareActivatedByWebhookFunction(
  requiredParameters,
  async (context, event, callback, response, handleError) => {
    try {
      const { ConversationSid, EventType } = event;
      let status;

      if (EventType === 'onConversationStateUpdated') {
        const { StateTo } = event;

        if (StateTo === 'inactive') {
          const { data } = await twilioExecute(context, (client) =>
            client.conversations.v1.conversations(ConversationSid).fetch(),
          );
          const conversationAttributes = JSON.parse(data.attributes);
          const {
            defaultColor,
            existingTaskSids,
            initialColor,
            timeToChangeToUrgencyColor,
            urgencyColor,
            warningColor,
          } = conversationAttributes;

          if (existingTaskSids && Array.isArray(existingTaskSids)) {
            const taskResults = [];

            for (const taskSid of existingTaskSids) {
              try {
                const { data } = await twilioExecute(context, (client) =>
                  client.taskrouter.v1.workspaces(context.TWILIO_FLEX_WORKSPACE_SID).tasks(taskSid).fetch(),
                );
                const taskAttributes = JSON.parse(data.attributes);
                const { color } = taskAttributes;
                let newColor;

                if (color === (defaultColor || '#E1E3EA')) {
                  taskResults.push({
                    taskSid,
                    message: 'Nothing to do since the customer has not replied the agent back yet',
                    success: true,
                  });
                } else if (color === (initialColor || '#34eb55')) {
                  await twilioExecute(context, (client) =>
                    client.conversations.v1.conversations(ConversationSid).update({
                      state: 'active',
                    }),
                  );

                  await twilioExecute(context, (client) =>
                    client.conversations.v1.conversations(ConversationSid).update({
                      'timers.inactive': `PT${timeToChangeToUrgencyColor}M`,
                    }),
                  );

                  newColor = warningColor || 'yellow';
                } else if (color === (warningColor || 'yellow')) {
                  newColor = urgencyColor || 'red';
                } else {
                  taskResults.push({
                    taskSid,
                    message: 'Nothing to do since the agent has not replied the customer back yet',
                    success: true,
                  });
                }

                if (newColor) {
                  const newAttributes = {
                    ...taskAttributes,
                    color: newColor,
                  };

                  await twilioExecute(context, (client) =>
                    client.taskrouter.v1
                      .workspaces(context.TWILIO_FLEX_WORKSPACE_SID)
                      .tasks(taskSid)
                      .update({
                        attributes: JSON.stringify(newAttributes),
                      }),
                  );

                  taskResults.push({
                    taskSid,
                    message: `The color attribute has been succesfully updated to ${newColor} in the task ${taskSid}`,
                    success: true,
                  });
                }
              } catch (error) {
                taskResults.push({
                  taskSid,
                  message: `The following error has occured while checking the task ${taskSid} to be updated or not: ${error.message}`,
                  success: false,
                });
              }
            }

            if (taskResults.every((result) => result.success === false)) {
              status = 400;
            } else if (taskResults.some((result) => result.success === false)) {
              status = 207;
            } else {
              status = 200;
            }

            response.setStatusCode(status);
            response.setBody(taskResults);
          } else {
            await twilioExecute(context, (client) =>
              client.conversations.v1.conversations(ConversationSid).update({
                state: 'active',
              }),
            );

            response.setStatusCode(204);
            response.setBody({
              message: 'Nothing to do since no agent has accepted the pending task yet',
              success: true,
            });
          }
        } else {
          response.setStatusCode(204);
          response.setBody({
            message: 'Nothing to do in this state',
            success: true,
          });
        }
      } else if (EventType === 'onMessageAdded') {
        const { data } = await twilioExecute(context, (client) =>
          client.conversations.v1.conversations(ConversationSid).fetch(),
        );
        const conversationAttributes = JSON.parse(data.attributes);
        const { defaultColor, existingTaskSids, initialColor, timeToChangeToWarningColor } =
          conversationAttributes;

        if (existingTaskSids && Array.isArray(existingTaskSids)) {
          const { data } = await twilioExecute(context, (client) =>
            client.taskrouter.v1.workspaces(context.TWILIO_FLEX_WORKSPACE_SID).workers.list(),
          );
          const { Author } = event;
          const workerFriendlyNames = data.map((worker) => worker.friendlyName);
          const taskResults = [];

          for (const taskSid of existingTaskSids) {
            try {
              const { data } = await twilioExecute(context, (client) =>
                client.taskrouter.v1.workspaces(context.TWILIO_FLEX_WORKSPACE_SID).tasks(taskSid).fetch(),
              );
              const taskAttributes = JSON.parse(data.attributes);
              const { color } = taskAttributes;
              let newColor;

              if (Author.startsWith('CH') || workerFriendlyNames.includes(Author)) {
                if (color !== (defaultColor || '#E1E3EA')) {
                  newColor = defaultColor || '#E1E3EA';
                } else {
                  taskResults.push({
                    taskSid,
                    message: 'Nothing to do since the agent has already sent the customer a message before',
                    success: true,
                  });
                }
              } else {
                if (color === (defaultColor || '#E1E3EA')) {
                  await twilioExecute(context, (client) =>
                    client.conversations.v1.conversations(ConversationSid).update({
                      'timers.inactive': `PT${timeToChangeToWarningColor}M`,
                    }),
                  );

                  newColor = initialColor || 'green';
                } else {
                  taskResults.push({
                    taskSid,
                    message: 'Nothing to do since the customer has already sent the agent a message before',
                    success: true,
                  });
                }
              }

              if (newColor) {
                const newAttributes = {
                  ...taskAttributes,
                  color: newColor,
                };

                await twilioExecute(context, (client) =>
                  client.taskrouter.v1
                    .workspaces(context.TWILIO_FLEX_WORKSPACE_SID)
                    .tasks(taskSid)
                    .update({
                      attributes: JSON.stringify(newAttributes),
                    }),
                );

                taskResults.push({
                  taskSid,
                  message: `The color attribute has been succesfully updated to ${newColor} in the task ${taskSid}`,
                  success: true,
                });
              }
            } catch (error) {
              taskResults.push({
                taskSid,
                message: `The following error has occured while checking the task ${taskSid} to be updated or not: ${error.message}`,
                success: false,
              });
            }
          }

          if (taskResults.every((result) => result.success === false)) {
            status = 400;
          } else if (taskResults.some((result) => result.success === false)) {
            status = 207;
          } else {
            status = 200;
          }

          response.setStatusCode(status);
          response.setBody(taskResults);
        } else {
          response.setStatusCode(204);
          response.setBody({
            message: 'Nothing to do since no agent has accepted the pending task yet',
            success: true,
          });
        }
      } else {
        response.setStatusCode(204);
        response.setBody({
          message: 'Nothing to do in this type of event',
          success: true,
        });
      }

      console.log(EventType, response);
      return callback(null, response);
    } catch (error) {
      return handleError(error);
    }
  },
);
