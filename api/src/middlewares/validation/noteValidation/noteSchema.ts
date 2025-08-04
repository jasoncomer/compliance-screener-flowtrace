import Joi from 'joi';

export const createNoteSchema = Joi.object({
  content: Joi.string().required().max(5000).trim()
    .messages({
      'string.empty': 'Note content is required',
      'string.max': 'Note content cannot exceed 5000 characters',
      'any.required': 'Note content is required'
    })
});

export const updateNoteSchema = Joi.object({
  content: Joi.string().required().max(5000).trim()
    .messages({
      'string.empty': 'Note content is required',
      'string.max': 'Note content cannot exceed 5000 characters',
      'any.required': 'Note content is required'
    })
}); 