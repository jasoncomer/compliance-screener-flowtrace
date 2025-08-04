import mongoose, { Types } from 'mongoose';
import { INoteCreate, INoteUpdate, INotePopulated } from '@src/interfaces/note';
import { INoteDocument } from '@src/models/Note.model';
import { modelFactory } from '@src/db/modelFactory';

export const noteService = {
  /**
   * Create a new note
   */
  createNote: async (
    organizationId: string,
    userId: string,
    noteData: INoteCreate
  ): Promise<INoteDocument> => {
    // Determine note type based on provided data
    let type: 'general' | 'transaction' | 'address' = 'general';
    if (noteData.transactionId) {
      type = 'transaction';
    } else if (noteData.address) {
      type = 'address';
    }

    // Override type if explicitly provided
    if (noteData.type) {
      type = noteData.type;
    }

    const Note = await modelFactory.getModel('Notes');
    const note = new Note({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      createdBy: new mongoose.Types.ObjectId(userId),
      content: noteData.content,
      transactionId: noteData.transactionId,
      address: noteData.address,
      type
    });

    return await note.save();
  },

  /**
   * Get all notes for an organization
   */
  getNotesByOrganization: async (
    organizationId: string
  ): Promise<INoteDocument[]> => {
    const Note = await modelFactory.getModel('Notes');
    return await Note.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      type: 'general'
    })
      .sort({ createdAt: -1 })
      .exec();
  },

  /**
   * Get notes for a specific transaction
   */
  getNotesByTransaction: async (
    organizationId: string,
    transactionId: string
  ): Promise<INoteDocument[]> => {
    const Note = await modelFactory.getModel('Notes');
    return await Note.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      transactionId,
      type: 'transaction'
    })
      .sort({ createdAt: -1 })
      .exec();
  },

  /**
   * Get notes for a specific address
   */
  getNotesByAddress: async (
    organizationId: string,
    address: string
  ): Promise<INoteDocument[]> => {
    const Note = await modelFactory.getModel('Notes');
    return await Note.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      address,
      type: 'address'
    })
      .sort({ createdAt: -1 })
      .exec();
  },

  /**
   * Get a note by ID
   */
  getNoteById: async (
    noteId: string,
    organizationId: string
  ): Promise<INoteDocument | null> => {
    const Note = await modelFactory.getModel('Notes');
    return await Note.findOne({
      _id: new mongoose.Types.ObjectId(noteId),
      organizationId: new mongoose.Types.ObjectId(organizationId)
    });
  },

  /**
   * Update a note
   */
  updateNote: async (
    noteId: string,
    organizationId: Types.ObjectId,
    userId: Types.ObjectId,
    updateData: INoteUpdate
  ): Promise<INoteDocument | null> => {
    const Note = await modelFactory.getModel('Notes');
    // First check if the note exists and belongs to the organization
    const note = await Note.findOne({
      _id: new mongoose.Types.ObjectId(noteId),
      organizationId: new mongoose.Types.ObjectId(organizationId)
    });

    if (!note) {
      return null;
    }

    // Check if the user is the creator of the note
    if (note.createdBy.toString() !== userId.toString()) {
      throw new Error('You can only update your own notes');
    }

    // Update the note
    note.content = updateData.content;
    return await note.save();
  },

  /**
   * Delete a note
   */
  deleteNote: async (noteIdRaw: string, organizationId: string, userId: Types.ObjectId): Promise<boolean> => {
    try {
      const Note = await modelFactory.getModel('Notes');

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(noteIdRaw)) {
        return false;
      }

      const noteId = new mongoose.Types.ObjectId(noteIdRaw);

      // First check if the note exists and belongs to the organization
      const note = await Note.findOne({
        _id: noteId,
        organizationId: new mongoose.Types.ObjectId(organizationId)
      });

      if (!note) {
        return false;
      }

      // Check if the user is the creator of the note
      if (note.createdBy?.toString() !== userId.toString()) {
        throw new Error('You can only delete your own notes');
      }

      // Delete the note
      await Note.deleteOne({ _id: noteId });
      return true;
    } catch (error) {
      console.error('Error deleting note:', error);
      return false;
    }
  },

  /**
   * Format note for response
   */
  addUserDataToNote: async (
    noteDoc: INoteDocument,
    includeUser = false
  ): Promise<INotePopulated> => {
    const note = noteDoc.toObject() as INotePopulated;
    if (includeUser) {
      // If we want to include user details, we could populate the user from the database
      const User = await modelFactory.getModel('User');
      const user = await User.findById(note.createdBy);
      if (user) {
        note.creatorName = `${user.name || ''} ${user.surname || ''}`.trim();
      }
    }

    return note;
  }
}; 