declare module 'connect-pg-simple' {
  import session from 'express-session';
  import { Pool } from 'pg';

  interface ConnectPgSimpleOptions {
    pool?: Pool;
    conString?: string;
    tableName?: string;
    schemaName?: string;
    ttl?: number;
    disableTouch?: boolean;
    pruneSessionInterval?: number;
    createTableIfMissing?: boolean;
    errorLog?: (...args: any[]) => void;
  }

  function connectPgSimple(session: any): new (options: ConnectPgSimpleOptions) => session.Store;

  export = connectPgSimple;
}