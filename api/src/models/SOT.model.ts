import { Document, Schema } from 'mongoose';

export interface SOT {
  date_updated: string;
  user: string;
  revisit_site: boolean;
  no_kyc_req: boolean;
  entity_id: string;
  url: string;
  proper_name: string;
  entity_type: string;
  dead: boolean;
  legal_info_url: string;
  contact_email: string;
  contact_telegram: string;
  contact_twitter: string;
  logo: string;
  centralized: boolean | null;
  year_founded: string;
  social_media_profile: string;
  social_media_profile_2: string;
  social_media_profile_3: string;
  description_merged: string;
  associate_country_1: string;

  // new fields
  parent_id: string;
  contact_phone: string;
  contact_address: string;
  social_media_profile_4: string;
  ticker: string; // can be an array (parse use comma as separator)
  note: string;
  entity_tag1: string;
  entity_tag2: string;
  entity_tag3: string;
  entity_tag4: string;
  entity_tag5: string;
  entity_tag6: string;
  entity_tag7: string;
  associate_country_2: string;
  associate_country_3: string;
  associate_country_4: string;
  associate_country_5: string;
  associate_country_6: string;
  ens_address: string;
  key_personnel: string; // can be an array (parse use comma as separator)
  ceo: string;
  ofac: boolean;
}
export interface SOTV2 extends SOT {
  entity_tags: string[];
  associated_countries: string[];
  social_media_profiles: string[];
}

export interface SOTDocument extends SOT, Document { }

export const SOTSchema = new Schema<SOTDocument>({
  date_updated: String,
  user: String,
  revisit_site: Boolean,
  no_kyc_req: Boolean,
  entity_id: String,
  url: String,
  proper_name: String,
  entity_type: String,
  dead: Boolean,
  legal_info_url: String,
  contact_email: String,
  contact_telegram: String,
  contact_twitter: String,
  logo: String,
  centralized: Boolean,
  year_founded: String,
  social_media_profile: String,
  social_media_profile_2: String,
  social_media_profile_3: String,

  description_merged: String,
  associate_country_1: String,

  // new fields
  parent_id: String,
  contact_phone: String,
  contact_address: String,
  social_media_profile_4: String,
  ticker: String,
  note: String,
  entity_tag1: String,
  entity_tag2: String,
  entity_tag3: String,
  entity_tag4: String,
  entity_tag5: String,
  entity_tag6: String,
  entity_tag7: String,
  associate_country_2: String,
  associate_country_3: String,
  associate_country_4: String,
  associate_country_5: String,
  associate_country_6: String,
  ens_address: String,
  key_personnel: String,
  ceo: String,
  ofac: Boolean,
});