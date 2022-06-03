import { Pool } from 'pg'
import type { PoolConfig } from 'pg'

/*
  reference of required values for pg PoolConfig:

  host: string,
  port: string,
  user: string,
  password: string,
  database: string,
  ssl: boolean,
*/

export const getConnectionPool = async (config: PoolConfig) => {
  return new Pool({
    ...config,
  })
}
