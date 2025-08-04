import Joi from 'joi';
import { EMemberRole } from '@src/interfaces/organization';

export const organizationSchema = {
  createOrganization: Joi.object({
    name: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 50 characters',
        'any.required': 'Name is required'
      }),
    description: Joi.string()
      .max(500)
      .optional()
      .messages({
        'string.max': 'Description cannot exceed 500 characters'
      }),
    email: Joi.string()
      .email()
      .max(128)
      .required()
      .messages({
        'string.email': 'Invalid email address format',
        'string.max': 'Email cannot exceed 128 characters'
      }),
    settings: Joi.object({
      maxMembers: Joi.number()
        .min(1)
        .max(100)
        .default(10)
        .messages({
          'number.min': 'Maximum members must be at least 1',
          'number.max': 'Maximum members cannot exceed 100'
        }),
      allowedDomains: Joi.array()
        .items(
          Joi.string()
            .email({ tlds: { allow: false } })
            .messages({
              'string.email': 'Allowed domains must be valid email domains'
            })
        )
        .optional()
    }).default()
  }),

  inviteMembers: Joi.object({
    emails: Joi.array()
      .items(
        Joi.string()
          .email()
          .required()
          .messages({
            'string.email': 'Invalid email address format',
            'any.required': 'Email address is required'
          })
      )
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one email address is required',
        'any.required': 'Email addresses are required'
      }),
    role: Joi.string()
      .valid('manager', 'team_member')
      .default('team_member')
      .messages({
        'any.only': 'Role must be either manager or team_member'
      })
  }),

  joinOrganization: Joi.object({
    code: Joi.string()
      .required()
      .messages({
        'any.required': 'Invite code is required'
      }),
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Invalid email address format',
        'any.required': 'Email address is required'
      })
  }),

  updateOrganization: Joi.object({
    name: Joi.string()
      .min(2)
      .max(50)
      .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 50 characters'
      }),
    description: Joi.string()
      .max(500)
      .messages({
        'string.max': 'Description cannot exceed 500 characters'
      }),
    email: Joi.string()
      .email()
      .max(128)
      .messages({
        'string.email': 'Invalid email address format',
        'string.max': 'Email cannot exceed 128 characters'
      }),
    settings: Joi.object({
      maxMembers: Joi.number()
        .min(1)
        .max(100)
        .messages({
          'number.min': 'Maximum members must be at least 1',
          'number.max': 'Maximum members cannot exceed 100'
        }),
      allowedDomains: Joi.array()
        .items(
          Joi.string()
            .email({ tlds: { allow: false } })
            .messages({
              'string.email': 'Allowed domains must be valid email domains'
            })
        )
    })
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  }),

  updateMemberRole: Joi.object({
    role: Joi.string()
      .valid(EMemberRole.ADMIN, EMemberRole.MANAGER, EMemberRole.TEAM_MEMBER)
      .required()
      .messages({
        'any.only': 'Role must be either manager or team_member',
        'any.required': 'Role is required'
      })
  })
}; 