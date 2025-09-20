const { prepareEventStreamsFunction, extractStandardResponse } = require(Runtime.getFunctions()[
  'common/helpers/function-helper'
].path);
const TaskRouterOperations = require(Runtime.getFunctions()['common/twilio-wrappers/taskrouter'].path);

const requiredParameters = [
  { key: 'data', purpose: 'object containing task information' },
  { key: 'type', purpose: 'path alike string that indicates the kind of event' },
];

exports.handler = prepareEventStreamsFunction(
  requiredParameters,
  async (context, event, callback, response, handleError) => {
    try {
      const { data, type } = event[0];

      let result = {
        message: 'Nothing to do since there is no handling for this event',
        status: 200,
        success: true,
      };

      if (type.includes('com.twilio.taskrouter') && type.includes('task.created')) {
        const { payload } = data;
        const { task_date_created, task_attributes, task_sid } = payload;

        const parsedTaskAttributes = JSON.parse(task_attributes);
        const newAttributes = {
          ...parsedTaskAttributes,
          originalDateCreated: task_date_created,
        };

        result = await TaskRouterOperations.updateTaskAttributes({
          context,
          taskSid: task_sid,
          attributesUpdate: JSON.stringify(newAttributes),
        });

        if (!result.message) {
          result.message = `Original date created attribute has been succesfully configured in the task ${result.data.sid}`;
        }
      }

      response.setStatusCode(result.status);
      response.setBody({ ...extractStandardResponse(result) });
      console.log(response);
      return callback(null, response);
    } catch (error) {
      return handleError(error);
    }
  },
);
