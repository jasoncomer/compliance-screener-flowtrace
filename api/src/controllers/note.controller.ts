import { Response, Request } from 'express';
import { Types } from 'mongoose';
import createHttpError from 'http-errors';
import { noteService } from '@src/services/note.service';
import { IAuthRequest } from '@src/interfaces/User';
import { IAuthOrgRequest } from '@src/interfaces/generic';
import { customResponse } from '@src/utils/customResponse';


// Extracted validation logic
const validateNoteContent = (content: string) => {
  if (!content || content.trim() === '') {
    return { valid: false, message: 'Note content is required' };
  }
  if (content.length > 5000) {
    return { valid: false, message: 'Note content cannot exceed 5000 characters' };
  }
  return { valid: true };
};


/**
 * Create a new note
 */
export const createNoteController = async (req: Request, res: Response) => {
  try {
    // Validate note content
    const validation = validateNoteContent((req as any).body.content);
    if (!validation.valid) {
      throw new createHttpError.BadRequest(validation.message);
    }

    const userId = (req as IAuthRequest).user?._id;
    const { organizationId } = (req as any).params;

    if (!userId) {
      return customResponse({
        status: 401,
        success: false,
        message: 'Unauthorized',
        data: null,
        error: true
      });
    }

    const note = await noteService.createNote(organizationId, userId, (req as any).body);
    const formattedNote = await noteService.addUserDataToNote(note, true);

    return res.send(customResponse({
      status: 201,
      success: true,
      message: 'Note created successfully',
      data: formattedNote,
      error: false
    }));
  } catch (error) {
    return createHttpError.InternalServerError('Failed to create note');
  }
};

/**
 * Get all notes for an organization
 */
export const getOrganizationNotesController = async (req: Request, res: Response) => {
  try {
    const { organizationId } = (req as any).params;

    const notes = await noteService.getNotesByOrganization(organizationId);
    const formattedNotes = await Promise.all(
      notes.map(note => noteService.addUserDataToNote(note, true))
    );

    return customResponse({
      status: 200,
      success: true,
      message: 'Notes fetched successfully',
      data: formattedNotes,
      error: false
    });
  } catch (error) {
    return createHttpError.InternalServerError('Failed to fetch notes');
  }
};

/**
 * Get notes for a specific transaction
 */
export const getTransactionNotesController = async (req: Request, res: Response) => {
  try {
    const { organizationId, transactionId } = (req as any).params;
    const decodedTransactionId = decodeURIComponent(transactionId);

    const notes = await noteService.getNotesByTransaction(organizationId, decodedTransactionId);
    const formattedNotes = await Promise.all(
      notes.map(note => noteService.addUserDataToNote(note, true))
    );

    return res.send(customResponse({
      status: 200,
      success: true,
      message: 'Notes fetched successfully',
      data: formattedNotes,
      error: false
    }));
  } catch (error) {
    return createHttpError.InternalServerError('Failed to fetch transaction notes');
  }
};

/**
 * Get notes for a specific address
 */
export const getAddressNotesController = async (req: Request, res: Response) => {
  try {

    const { organizationId, address } = (req as any).params;
    const decodedAddress = decodeURIComponent(address);

    const notes = await noteService.getNotesByAddress(organizationId, decodedAddress);
    const formattedNotes = await Promise.all(
      notes.map(note => noteService.addUserDataToNote(note, true))
    );

    return res.send(customResponse({
      status: 200,
      success: true,
      message: 'Notes fetched successfully',
      data: formattedNotes,
      error: false
    }));
  } catch (error) {
    return createHttpError.InternalServerError('Failed to fetch address notes');
  }
};

/**
 * Get a specific note by ID
 */
export const getNoteByIdController = async (req: Request, res: Response) => {
  try {
    const { organizationId, noteId } = (req as any).params;

    const note = await noteService.getNoteById(noteId, organizationId);

    if (!note) {
      return res.send(customResponse({
        status: 404,
        success: false,
        message: 'Note not found',
        data: null,
        error: true
      }));
    }

    const formattedNote = await noteService.addUserDataToNote(note, true);

    return res.send(customResponse({
      status: 200,
      success: true,
      message: 'Note fetched successfully',
      data: formattedNote,
      error: false
    }));
  } catch (error) {
    return createHttpError.InternalServerError('Failed to fetch note');
  }
};

/**
 * Update a note
 */
export const updateNoteController = async (req: Request, res: Response) => {
  try {
    // Validate note content
    const validation = validateNoteContent((req as any).body.content);
    if (!validation.valid) {
      return customResponse({
        status: 400,
        success: false,
        message: validation.message || 'Invalid note content',
        data: null,
        error: true
      });
    }

    const userId = (req as IAuthRequest).user?._id;
    const organizationId = (req as IAuthOrgRequest).organization?._id;
    const { noteId } = (req as any).params;

    if (!userId || !organizationId) {
      return res.send(customResponse({
        status: 401,
        success: false,
        message: 'Unauthorized',
        data: null,
        error: true
      }));
    }

    const note = await noteService.updateNote(noteId, organizationId, userId, (req as any).body);
    if (!note) {
      return res.send(customResponse({
        status: 404,
        success: false,
        message: 'Note not found',
        data: null,
        error: true
      }));
    }

    const formattedNote = await noteService.addUserDataToNote(note, true);
    return res.send(customResponse({
      status: 200,
      success: true,
      message: 'Note updated successfully',
      data: formattedNote,
      error: false
    }));
  } catch (error) {
    return createHttpError.InternalServerError('Failed to update note');
  }
};

/**
 * Delete a note
 */
export const deleteNoteController = async (req: Request, res: Response) => {
  try {
    const userId: Types.ObjectId = (req as IAuthRequest).user?._id;
    const { organizationId, noteId } = (req as any).params;

    if (!userId) {
      return res.send(customResponse({
        status: 401,
        success: false,
        message: 'Unauthorized',
        data: null,
        error: true
      }));
    }

    await noteService.deleteNote(noteId, organizationId, userId);

    return res.send(customResponse({
      status: 204,
      success: true,
      message: 'Note deleted successfully',
      data: null,
      error: false
    }));
  } catch (error) {
    return createHttpError.InternalServerError('Failed to delete note');
  }
}; 