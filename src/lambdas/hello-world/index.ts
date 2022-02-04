import 'source-map-support/register'
import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2, APIGatewayProxyResultV2, Context } from 'aws-lambda'
import pino from 'pino-lambda'

const logger = pino()

export const main: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
  context: Context,
): Promise<APIGatewayProxyResultV2> => {
  logger.withRequest(event, context)

  return {
    statusCode: 200,
    headers: undefined,
    body: JSON.stringify({ hello: 'world' }),
  }
}
