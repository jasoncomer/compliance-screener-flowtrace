import { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';
import axios from 'axios';
import { customResponse } from '@src/utils';
import { modelFactory } from '@src/db/modelFactory';
import { environmentConfig } from '@src/configs/custom-environment-variables.config';
import { ResponseT, IAuthRequest } from '@src/interfaces';

export const submitContactSalesService = async (req: Request | IAuthRequest, res: Response<ResponseT<any>>, next: NextFunction) => {
  try {
    const { email, company, companySize, message } = req.body;

    // Validate required fields
    if (!email || !company || !companySize || !message) {
      return next(createHttpError(400, 'All fields are required'));
    }

    // Get client IP and User Agent for tracking
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string;
    const userAgent = req.headers['user-agent'];

    // Get userId if user is authenticated
    const userId = (req as IAuthRequest).user?._id || null;

    // Create contact sales record
    const ContactSales = await modelFactory.getModel('ContactSales');
    const contactSalesRecord = new ContactSales({
      userId,
      email,
      company,
      companySize,
      message,
      ipAddress,
      userAgent,
    });

    await contactSalesRecord.save();

    // Send Slack notification
    await sendSlackNotification({
      email,
      company,
      companySize,
      message,
      submittedAt: new Date(),
      id: contactSalesRecord._id,
      userId,
    });

    return res.status(201).json(
      customResponse({
        success: true,
        error: false,
        message: 'Contact sales request submitted successfully. Our team will get in touch with you shortly.',
        status: 201,
        data: {
          id: contactSalesRecord._id,
          submittedAt: contactSalesRecord.createdAt,
        },
      })
    );
  } catch (error: any) {
    console.error('Error submitting contact sales request:', error);
    return next(createHttpError.InternalServerError('Failed to submit contact sales request'));
  }
};

interface SlackNotificationData {
  email: string;
  company: string;
  companySize: string;
  message: string;
  submittedAt: Date;
  id: string;
  userId?: any;
}

const sendSlackNotification = async (data: SlackNotificationData) => {
  if (!environmentConfig.SLACK_NEW_USERS_CHANNEL_WEBHOOK_URL) {
    console.warn('SLACK_NEW_USERS_CHANNEL_WEBHOOK_URL not configured, skipping Slack notification');
    return;
  }

  try {
    const userInfo = data.userId ? `*User ID:*\n${data.userId}` : '*User:*\nAnonymous';

    const slackMessage = {
      text: "🚀 New Contact Sales Request",
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🚀 New Contact Sales Request"
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Email:*\n${data.email}`
            },
            {
              type: "mrkdwn",
              text: `*Company:*\n${data.company}`
            },
            {
              type: "mrkdwn",
              text: `*Company Size:*\n${data.companySize} employees`
            },
            {
              type: "mrkdwn",
              text: userInfo
            },
            {
              type: "mrkdwn",
              text: `*Submitted:*\n${data.submittedAt.toLocaleString()}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Message:*\n${data.message}`
          }
        },
        {
          type: "divider"
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `Request ID: \`${data.id}\``
            }
          ]
        }
      ]
    };

    await axios.post(environmentConfig.SLACK_NEW_USERS_CHANNEL_WEBHOOK_URL, slackMessage, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Slack notification sent successfully for contact sales request:', data.id);
  } catch (error: any) {
    console.error('Failed to send Slack notification:', error.message);
    // Don't throw error - we don't want to fail the request if Slack notification fails
  }
};

export const getContactSalesRequestsService = async (req: Request, res: Response<ResponseT<any>>, next: NextFunction) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const ContactSales = await modelFactory.getModel('ContactSales');

    const filter: any = {};
    if (status) {
      filter.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [requests, total] = await Promise.all([
      ContactSales.find(filter)
        .populate('userId', 'name surname email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ContactSales.countDocuments(filter)
    ]);

    return res.status(200).json(
      customResponse({
        success: true,
        error: false,
        message: 'Contact sales requests retrieved successfully',
        status: 200,
        data: {
          requests,
          pagination: {
            currentPage: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            totalRequests: total,
            hasNext: skip + Number(limit) < total,
            hasPrev: Number(page) > 1,
          },
        },
      })
    );
  } catch (error: any) {
    console.error('Error retrieving contact sales requests:', error);
    return next(createHttpError.InternalServerError('Failed to retrieve contact sales requests'));
  }
}; 