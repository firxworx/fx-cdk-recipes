import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
import type { SecretsManagerClientConfig } from '@aws-sdk/client-secrets-manager'

/**
 * Get a secrets manager client from aws-sdk v3.
 *
 * It is recommended to specify the AWS `region` in the config especially for requesting secrets
 * by name vs. full ARN.
 *
 * @param config
 * @returns
 */
export const getSecretsManagerClient = (config: SecretsManagerClientConfig) => {
  return new SecretsManagerClient({ ...config })
}

/**
 * Get a parsed JSON secret from Secrets Manager.
 *
 * @param client instance of secrets manager client
 * @param secretId secret name or secret ARN (full ARN vs. partial recommended)
 */
export const getJsonSecret = async <T = Record<string, unknown>>(
  client: SecretsManagerClient,
  secretId?: string,
): Promise<T> => {
  const getSecretValueCommand = new GetSecretValueCommand({
    SecretId: secretId,
  })

  const secretValue = await client.send(getSecretValueCommand)

  if (!secretValue.SecretString) {
    throw new Error(`Missing expected SecretString in secret <${secretId}>`)
  }

  return JSON.parse(secretValue.SecretString) as T
}
