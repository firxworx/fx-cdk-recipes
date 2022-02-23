import 'source-map-support/register'
import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2, APIGatewayProxyResultV2, Context } from 'aws-lambda'
import pino from 'pino-lambda'

const logger = pino()

interface LogEvent {
  example: string
  nested: {
    a: number
    b: number
  }
}

/**
 * Lambda in TypeScript with CloudWatch-compatible JSON logging via pino-lambda.
 *
 * Query string parameters and other request data may be obtained from the `event` object
 * passed to the lambda handler by the HTTP API Gateway (API Gateway v2).
 *
 * Ensure the `esbuild` package is installed to build TS lambdas without Docker.
 *
 * See also the upcoming <https://github.com/awslabs/aws-lambda-powertools-typescript>
 */
export const main: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
  context: Context,
): Promise<APIGatewayProxyResultV2> => {
  logger.withRequest(event, context)

  const logEvent: LogEvent = {
    example: 'log data',
    nested: {
      a: 1,
      b: 2,
    },
  }

  logger.info<LogEvent>(logEvent, 'Request Received')

  return {
    statusCode: 200,
    headers: undefined,
    body: JSON.stringify({ date: new Date().toISOString(), greeting: 'hello world' }),
  }
}
