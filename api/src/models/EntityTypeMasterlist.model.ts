import { Document, Schema } from 'mongoose';

/**
 * EntityTypeMasterlist represents the structure of entity type data from the Google Sheets
 * 
 * CSV Structure mapping:
 * - entity_type: Primary identifier (e.g., "adult content", "centralized exchange")
 * - display_name: Human-readable display name
 * - entity_type_display: Maps to "Entity Type" column in CSV
 * - subcategory: Entity subcategory classification
 * - category: Entity category classification
 * - top_level_group: Top-level group classification
 * - recovery_chance: Recovery probability information
 * - entity_type_default_logo: URL to default logo for entity type
 * - description: Detailed description of the entity type
 * - risk_score_type: Numeric risk score (0-100)
 * - risk: Boolean indicating if entity type is considered risky
 */
export interface EntityTypeMasterlist {
  entity_type: string;
  display_name: string;
  entity_type_display: string; // Maps to "Entity Type" column
  subcategory: string;
  category: string;
  top_level_group: string;
  recovery_chance: string;
  entity_type_default_logo: string;
  description: string;
  risk_score_type: number;
  risk: boolean;
}

export interface EntityTypeMasterlistDocument extends EntityTypeMasterlist, Document { }

export const EntityTypeMasterlistSchema = new Schema<EntityTypeMasterlist>({
  entity_type: { type: String, required: true, unique: true },
  display_name: { type: String, required: false },
  entity_type_display: { type: String, required: false },
  subcategory: { type: String, required: false },
  category: { type: String, required: false },
  top_level_group: { type: String, required: false },
  recovery_chance: { type: String, required: false },
  entity_type_default_logo: { type: String, required: false },
  description: { type: String, required: false },
  risk_score_type: { type: Number, required: false, default: 0 },
  risk: { type: Boolean, required: false, default: false }
}, {
  timestamps: true
});

// Index for faster queries
EntityTypeMasterlistSchema.index({ entity_type: 1 }); 