import mongoose, { Model } from 'mongoose';
import { connectionManager } from './connectionManager';
import {
  UserSchema,
  TokenSchema,
  btcAddressSchema,
  btcBlockSchema,
  btcTransactionSchema,
  IBtcAddress,
  BtcTransaction,
  ITokenDocument,
  IUserDocument,
  IBtcAddressDocument,
  BtcBlockDocument,
  BtcTransactionDocument,
  btcAttributionSchema,
  BtcAttributionDocument,
  SOTDocument,
  SOTSchema,
  SOTSyncLogDocument,
  SOTSyncLogSchema,
  EntityTypeMasterlistDocument,
  EntityTypeMasterlistSchema,
  EntityTypeMasterlistSyncLogDocument,
  EntityTypeMasterlistSyncLogSchema,
  OrganizationSchema,
  IOrganizationDocument,
  SubscriptionSchema,
  ContactSalesSchema,
  IContactSalesDocument,
  NoteSchema,
  INoteDocument
} from '../models';
import { ICase, ICaseDocument, IToken, IUser } from '@src/interfaces';
import { caseSchema } from '@src/models/Case.model';
import { IReferenceAttributionDocument, referenceAttributionSchema } from '@src/models/ReferenceAttribution';
import MonitoredAddressSchema, { MonitoredAddressDocument } from '@src/models/compliance/MonitoredAddress.model';
import ComplianceTransactionSchema, { ComplianceTransactionDocument } from '@src/models/compliance/ComplianceTransaction.model';
import MonitoredAddressChangeSchema, { MonitoredAddressChangeDocument } from '@src/models/compliance/MonitoredAddressChange.model';
import { btcWalletSchema, IBtcWalletDocument } from '@src/models/BtcWallets.model';
import { BtcAttributionRankedDocument, btcAttributionRankedSchema } from '@src/models/BtcAttributionRanked.model';
import { ISubscriptionDocument } from '@src/models/Subscription.model';

class ModelFactory {
  private models: Map<string, mongoose.Model<any>> = new Map();

  private modelDbMap = {
    BTCAddress: 'bitcoin',
    BtcAttribution: 'bitcoin',
    BtcAttributionRanked: 'bitcoin',
    BTCBlock: 'bitcoin',
    BTCTransaction: 'bitcoin',
    BTCWallets: 'bitcoin',
    Case: 'blockscout-db',
    ContactSales: 'blockscout-db',
    Organization: 'blockscout-db',
    ReferenceAttribution: 'bitcoin',
    SOT: 'sot',
    SOTSyncLog: 'sot',
    EntityTypeMasterlist: 'blockscout-db',
    EntityTypeMasterlistSyncLog: 'blockscout-db',
    Token: 'blockscout-db',
    User: 'blockscout-db',
    MonitoredAddress: 'blockscout-db',
    ComplianceTransaction: 'blockscout-db',
    MonitoredAddressChange: 'blockscout-db',
    OrganizationSubscription: 'blockscout-db',
    Notes: 'blockscout-db'
  };

  async getModel(modelType: 'Case'): Promise<Model<ICaseDocument>>;
  async getModel(modelType: 'ContactSales'): Promise<Model<IContactSalesDocument>>;
  async getModel(modelType: 'Organization'): Promise<Model<IOrganizationDocument>>;
  async getModel(modelType: 'ReferenceAttribution'): Promise<Model<IReferenceAttributionDocument>>;
  async getModel(modelType: 'SOT'): Promise<Model<SOTDocument>>;
  async getModel(modelType: 'SOTSyncLog'): Promise<Model<SOTSyncLogDocument>>;
  async getModel(modelType: 'EntityTypeMasterlist'): Promise<Model<EntityTypeMasterlistDocument>>;
  async getModel(modelType: 'EntityTypeMasterlistSyncLog'): Promise<Model<EntityTypeMasterlistSyncLogDocument>>;
  async getModel(modelType: 'Token'): Promise<Model<ITokenDocument>>;
  async getModel(modelType: 'User'): Promise<Model<IUserDocument>>;
  async getModel(modelType: 'MonitoredAddress'): Promise<Model<MonitoredAddressDocument>>;
  async getModel(modelType: 'ComplianceTransaction'): Promise<Model<ComplianceTransactionDocument>>;
  async getModel(modelType: 'MonitoredAddressChange'): Promise<Model<MonitoredAddressChangeDocument>>;
  async getModel(modelType: 'OrganizationSubscription'): Promise<Model<ISubscriptionDocument>>;
  async getModel(modelType: 'Notes'): Promise<Model<INoteDocument>>;

  async getModel(modelType: 'BTCAddress'): Promise<Model<IBtcAddressDocument>>;
  async getModel(modelType: 'BtcAttribution'): Promise<Model<BtcAttributionDocument>>;
  async getModel(modelType: 'BtcAttributionRanked'): Promise<Model<BtcAttributionRankedDocument>>;
  async getModel(modelType: 'BTCBlock'): Promise<Model<BtcBlockDocument>>;
  async getModel(modelType: 'BTCTransaction'): Promise<Model<BtcTransactionDocument>>;
  async getModel(modelType: 'BTCWallets'): Promise<Model<IBtcWalletDocument>>;

  async getModel(modelType: string): Promise<Model<any>> {
    const dbName = this.modelDbMap[modelType as keyof typeof this.modelDbMap];
    if (!dbName) {
      throw new Error(`Unknown model type: ${modelType}`);
    }

    const key = `${dbName}:${modelType}`;

    if (this.models.has(key)) {
      return this.models.get(key) as Model<any>;
    }

    const connection = await connectionManager.connect(dbName);
    let model: Model<any>;

    // Note: This is a workaround to avoid the reference error when populating ComplianceTransaction. Revisit.
    // Check if we need to pre-register MonitoredAddress for ComplianceTransaction
    // This ensures the reference exists before attempting to populate
    if (modelType === 'ComplianceTransaction') {
      const monitoredAddressKey = `${dbName}:MonitoredAddress`;
      if (!this.models.has(monitoredAddressKey)) {
        // Pre-register MonitoredAddress to avoid the reference error
        const monitoredAddressModel = connection.model<MonitoredAddressDocument>(
          'MonitoredAddress',
          MonitoredAddressSchema
        );
        this.models.set(monitoredAddressKey, monitoredAddressModel);
      }
    }

    switch (modelType) {
      case 'BTCAddress':
        model = connection.model<IBtcAddress>('Address', btcAddressSchema);
        break;
      case 'BtcAttribution':
        model = connection.model<BtcAttributionDocument>('Attribution', btcAttributionSchema);
        break;
      case 'BtcAttributionRanked':
        model = connection.model<BtcAttributionRankedDocument>('AttributionRanked', btcAttributionRankedSchema, 'attributions_ranked');
        break;
      case 'BTCBlock':
        model = connection.model<BtcBlockDocument>('Block', btcBlockSchema);
        break;
      case 'BTCTransaction':
        model = connection.model<BtcTransaction>('Transaction', btcTransactionSchema);
        break;
      case 'BTCWallets':
        model = connection.model<IBtcWalletDocument>('Wallets', btcWalletSchema, 'wallets');
        break;
      case 'Case':
        model = connection.model<ICase>('Case', caseSchema);
        break;
      case 'ReferenceAttribution':
        model = connection.model<IReferenceAttributionDocument>('reference', referenceAttributionSchema, 'reference');
        break;
      case 'Organization':
        model = connection.model('Organization', OrganizationSchema);
        break;
      case 'SOT':
        model = connection.model<SOTDocument>('entity', SOTSchema, 'entities');
        break;
      case 'SOTSyncLog':
        model = connection.model<SOTSyncLogDocument>('SotSyncLog', SOTSyncLogSchema, 'sot_sync_logs');
        break;
      case 'EntityTypeMasterlist':
        model = connection.model<EntityTypeMasterlistDocument>('EntityTypeMasterlist', EntityTypeMasterlistSchema, 'entity_type_masterlist');
        break;
      case 'EntityTypeMasterlistSyncLog':
        model = connection.model<EntityTypeMasterlistSyncLogDocument>('EntityTypeMasterlistSyncLog', EntityTypeMasterlistSyncLogSchema, 'entity_type_masterlist_sync_logs');
        break;
      case 'User':
        model = connection.model<IUser>('User', UserSchema);
        break;
      case 'Token':
        model = connection.model<IToken>('Token', TokenSchema);
        break;
      case 'MonitoredAddress':
        model = connection.model<MonitoredAddressDocument>('MonitoredAddress', MonitoredAddressSchema);
        break;
      case 'ComplianceTransaction':
        model = connection.model<ComplianceTransactionDocument>('ComplianceTransaction', ComplianceTransactionSchema);
        break;
      case 'MonitoredAddressChange':
        model = connection.model<MonitoredAddressChangeDocument>('MonitoredAddressChange', MonitoredAddressChangeSchema);
        break;
      case 'OrganizationSubscription':
        model = connection.model<ISubscriptionDocument>('OrganizationSubscription', SubscriptionSchema);
        break;
      case 'ContactSales':
        model = connection.model<IContactSalesDocument>('ContactSales', ContactSalesSchema);
        break;
      case 'Notes':
        model = connection.model<INoteDocument>('Notes', NoteSchema);
        break;
      default:
        throw new Error(`Unknown model type: ${modelType}`);
    }

    this.models.set(key, model);
    return model;
  }
}

export const modelFactory = new ModelFactory();
