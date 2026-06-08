import OidcClient from 'keycloak-js';

export function createIdentityClient(config: ConstructorParameters<typeof OidcClient>[0]) {
  return new OidcClient(config);
}
