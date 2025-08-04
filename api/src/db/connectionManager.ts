// connectionManager.ts
import mongoose from 'mongoose';
import logger from '@src/logger';

class ConnectionManager {
  private connections: Map<string, mongoose.Connection> = new Map();

  async connect(dbName: string): Promise<mongoose.Connection> {
    if (this.connections.has(dbName)) {
      return this.connections.get(dbName) as mongoose.Connection;
    }

    const MONGODB_CONNECTION_STRING = process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost:27017';
    const connection = mongoose.createConnection(`${MONGODB_CONNECTION_STRING}/${dbName}?authSource=admin`);

    await connection.asPromise();
    this.connections.set(dbName, connection);

    return connection;
  }

  getConnection(dbName: string): mongoose.Connection | undefined {
    return this.connections.get(dbName);
  }

  async closeAll(): Promise<void> {
    logger.info('Closing all database connections...');
    await Promise.all([...this.connections.values()].map((connection) => connection.close()));
    this.connections.clear();
    logger.info('All database connections closed.');
  }
}

export const connectionManager = new ConnectionManager();
