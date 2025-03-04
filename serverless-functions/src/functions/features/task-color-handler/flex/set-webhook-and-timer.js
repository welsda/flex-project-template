const { prepareFlexFunction, twilioExecute } = require(Runtime.getFunctions()['common/helpers/function-helper'].path);

const requiredParameters = [
  { key: 'conversationSid', purpose: 'conversation identifier' },
  { key: 'setColor', purpose: 'color set at the moment the task was accepted by a worker' },
  { key: 'timeToChangeToUrgencyColor', purpose: 'time to change the color of the conversation from the warning color to urgency color' },
  { key: 'timeToChangeToWarningColor', purpose: 'time to change the color of the conversation from the initial color to warning color' },
];

exports.handler = prepareFlexFunction(requiredParameters, async (context, event, callback, response, handleError) => {
  try {
    const { conversationSid, setColor, timeToChangeToUrgencyColor, timeToChangeToWarningColor } = event;

    let domainName = context.DOMAIN_NAME;

    if (domainName.includes('localhost:')) {
      if (context.LOCALTUNNEL_DOMAIN_NAME && context.LOCALTUNNEL_DOMAIN_NAME.includes('loca.lt')) {
        domainName = context.LOCALTUNNEL_DOMAIN_NAME;
      } else {
        response.setStatusCode(400);
        response.setBody({
          message: `Webhook and inactivation timer have not been configured in the conversation ${conversationSid} due to lack of a localtunnel domain in order to perform local testing`,
          status: 400,
          succes: false,
        });
        return callback(null, response);
      }
    }

    const existingWebhooks = await twilioExecute(context, (client) =>
      client.conversations.v1.conversations(conversationSid).webhooks.list(),
    );

    const existingWebhook = existingWebhooks.data.find(
      (webhook) =>
        webhook.configuration.url ===
        `https://${domainName}/features/task-color-handler/common/update-task-color-attribute`,
    );

    if (existingWebhook !== undefined) {
      response.setStatusCode(409);
      response.setBody({
        message: `There is a webhook and an inactivation timer already configured in the conversation ${conversationSid}. No need to configure a new one`,
        status: 409,
        succes: false,
        webhookSid: existingWebhook.sid,
      });
      return callback(null, response);
    } else {
      const { data: webhookData } = await twilioExecute(context, (client) =>
        client.conversations.v1.conversations(conversationSid).webhooks.create({
          'configuration.method': 'POST',
          'configuration.filters': ['onConversationStateUpdated', 'onMessageAdded'],
          'configuration.url': `https://${domainName}/features/task-color-handler/common/update-task-color-attribute`,
          target: 'webhook',
        }),
      );

      if (setColor !== 'urgencyColor') {
        await twilioExecute(context, (client) =>
          client.conversations.v1.conversations(conversationSid).update({
            'timers.inactive': `PT${
              setColor === 'initialColor' ? timeToChangeToWarningColor : timeToChangeToUrgencyColor
            }M`,
          }),
        );
      }

      response.setStatusCode(200);
      response.setBody({
        message: `A webhook ${
          setColor !== 'urgencyColor' ? 'and an inactivation timer have' : 'has'
        } been succesfully configured in the conversation ${conversationSid}`,
        status: 200,
        success: true,
        webhookSid: webhookData.sid,
      });
    }

    return callback(null, response);
  } catch (error) {
    return handleError(error);
  }
});
