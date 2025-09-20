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

            // process a single task in a separate async function to reduce nesting and avoid variable shadowing
            async function processTask(taskSid) {
              try {
                const { data: taskData } = await twilioExecute(context, (client) =>
                  client.taskrouter.v1.workspaces(context.TWILIO_FLEX_WORKSPACE_SID).tasks(taskSid).fetch(),
                );
                const taskAttributes = JSON.parse(taskData.attributes);
                const { color } = taskAttributes;
                let newColor;

                if (color === (defaultColor || '#E1E3EA')) {
                  await twilioExecute(context, (client) =>
                    client.conversations.v1.conversations(ConversationSid).update({
                      'timers.inactive': `PT0M`,
                    }),
                  );

                  taskResults.push({
                    taskSid,
                    message: 'Nothing to do since the customer has not replied the agent back yet',
                    success: true,
                  });
                  return;
                }

                if (color === (initialColor || '#34eb55')) {
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
                  await twilioExecute(context, (client) =>
                    client.conversations.v1.conversations(ConversationSid).update({
                      'timers.inactive': `PT0M`,
                    }),
                  );

                  newColor = urgencyColor || 'red';
                } else {
                  await twilioExecute(context, (client) =>
                    client.conversations.v1.conversations(ConversationSid).update({
                      'timers.inactive': `PT0M`,
                    }),
                  );

                  taskResults.push({
                    taskSid,
                    message: 'Nothing to do since the agent has not replied the customer back yet',
                    success: true,
                  });
                  return;
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

            // run all task processors in parallel (improves performance and keeps nesting shallow)
            await Promise.all(existingTaskSids.map((sid) => processTask(sid)));

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
        const { data: conversationData } = await twilioExecute(context, (client) =>
          client.conversations.v1.conversations(ConversationSid).fetch(),
        );
        const conversationAttributes = JSON.parse(conversationData.attributes);
        const { defaultColor, existingTaskSids, initialColor, timeToChangeToWarningColor } = conversationAttributes;

        if (existingTaskSids && Array.isArray(existingTaskSids)) {
          const { data: workersData } = await twilioExecute(context, (client) =>
            client.taskrouter.v1.workspaces(context.TWILIO_FLEX_WORKSPACE_SID).workers.list(),
          );
          const { Author } = event;
          const workerFriendlyNames = workersData.map((worker) => worker.friendlyName);
          const taskResults = [];

          // process a single task in a separate async function to reduce nesting and avoid variable shadowing
          async function processTask(taskSid) {
            try {
              const { data: taskData } = await twilioExecute(context, (client) =>
                client.taskrouter.v1.workspaces(context.TWILIO_FLEX_WORKSPACE_SID).tasks(taskSid).fetch(),
              );
              const taskAttributes = JSON.parse(taskData.attributes);
              const { color } = taskAttributes;
              let newColor;

              if (Author.startsWith('CH') || workerFriendlyNames.includes(Author)) {
                await twilioExecute(context, (client) =>
                  client.conversations.v1.conversations(ConversationSid).update({
                    'timers.inactive': `PT0M`,
                  }),
                );

                if (color === (defaultColor || '#E1E3EA')) {
                  taskResults.push({
                    taskSid,
                    message: 'Nothing to do since the agent has already sent the customer a message before',
                    success: true,
                  });
                  return;
                }

                newColor = defaultColor || '#E1E3EA';
              } else {
                if (color !== (defaultColor || '#E1E3EA')) {
                  taskResults.push({
                    taskSid,
                    message: 'Nothing to do since the customer has already sent the agent a message before',
                    success: true,
                  });
                  return;
                }

                await twilioExecute(context, (client) =>
                  client.conversations.v1.conversations(ConversationSid).update({
                    'timers.inactive': `PT${timeToChangeToWarningColor}M`,
                  }),
                );

                newColor = initialColor || 'green';
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

          // run all task processors in parallel (improves performance and keeps nesting shallow)
          await Promise.all(existingTaskSids.map((sid) => processTask(sid)));

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
