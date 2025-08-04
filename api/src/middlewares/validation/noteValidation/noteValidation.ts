import { Request, Response, NextFunction } from 'express';
import { createNoteSchema, updateNoteSchema } from './noteSchema';
import validator from '../validator';

/**
 * Validate create note request
 */
export const createNoteValidation = (req: Request, res: Response, next: NextFunction) => {
  validator(createNoteSchema, req.body, next);
};

/**
 * Validate update note request
 */
export const updateNoteValidation = (req: Request, res: Response, next: NextFunction) => {
  validator(updateNoteSchema, req.body, next);
}; 