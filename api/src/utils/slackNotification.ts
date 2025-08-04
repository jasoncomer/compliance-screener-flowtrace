import axios from 'axios';
import logger from '@src/logger';

// Initialize Slack webhook URL
const slackWebhookUrl = process.env.SLACK_NEW_USERS_CHANNEL_WEBHOOK_URL;

/**
 * Send a notification to a Slack channel
 * @param text The text message to send
 * @param blocks Optional Slack blocks for rich formatting
 * @returns Promise resolving to the result of the Slack API call or null if Slack is not configured
 */
export const sendSlackNotification = async (
  text: string,
  blocks?: any[]
): Promise<any | null> => {
  try {
    if (!slackWebhookUrl) {
      logger.warn('Slack notifications are disabled: SLACK_NEW_USERS_CHANNEL_WEBHOOK_URL not configured');
      return null;
    }

    const result = await axios.post(slackWebhookUrl, {
      text,
      blocks,
    });

    return result.data;
  } catch (error) {
    logger.error('Error sending Slack notification:', error);
    return null;
  }
};

/**
 * Send a notification about a new user registration
 * @param user The user object containing email, name, and other details
 * @returns Promise resolving to the result of the Slack API call
 */
export const sendNewUserRegistrationNotification = async (user: {
  email: string;
  name: string;
  surname?: string;
  _id: string;
}): Promise<any | null> => {
  const text = `New user registered: ${user.name} ${user.surname || ''} (${user.email})`;

  // Create rich message with blocks
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🎉 New User Registration',
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Name:*\n${user.name} ${user.surname || ''}`,
        },
        {
          type: 'mrkdwn',
          text: `*Email:*\n${user.email}`,
        },
      ],
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*User ID:*\n${user._id}`,
        },
        {
          type: 'mrkdwn',
          text: `*Registered:*\n${new Date().toISOString()}`,
        },
      ],
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Sent from Blockscout API`,
        },
      ],
    },
  ];

  return sendSlackNotification(text, blocks);
}; 