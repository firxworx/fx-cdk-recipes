import type { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult, Context } from 'aws-lambda'
import type { PoolConfig } from 'pg'
import pino from 'pino-lambda'

import { getConnectionPool } from '../common/postgres'
import { getJsonSecret, getSecretsManagerClient } from '../common/secrets'
import { successResponse } from '../common/tools'

const logger = pino()

export const main: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  logger.withRequest(event, context)

  const secretsManager = getSecretsManagerClient({ region: process.env.AWS_REGION })
  const secretValue = getJsonSecret<Partial<PoolConfig>>(secretsManager, process.env.SECRET_ARN_RDS ?? '')

  const pool = await getConnectionPool({
    ...secretValue,
    ssl: true,
  })
  logger.info('db connection established')

  await pool.query('CREATE USER test_user WITH LOGIN; GRANT rds_iam to test_user')
  logger.info('db user created')

  await pool.end()
  logger.info('db disconnected')

  return successResponse('User Created')
}
