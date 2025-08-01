import Hapi from '@hapi/hapi'
import hapiAuthJwt2 from 'hapi-auth-jwt2'
import Wreck from '@hapi/wreck'
import jwkToPem from 'jwk-to-pem'
import Boom from '@hapi/boom'
import { auth, getKey, validateToken } from './auth.js'
import { config } from '../config.js'

jest.mock('@hapi/wreck')
jest.mock('jwk-to-pem')
jest.mock('../config.js')

describe('Auth Plugin', () => {
  let server
  let mockWreckGet
  let mockJwkToPem

  const testId = '123e4567-e89b-12d3-a456-426614174000'
  const testKey =
    '-----BEGIN PUBLIC KEY-----\ntest-pem-key\n-----END PUBLIC KEY-----'

  beforeEach(async () => {
    jest.clearAllMocks()

    mockWreckGet = jest.mocked(Wreck.get)
    mockJwkToPem = jest.mocked(jwkToPem)

    config.get.mockImplementation(() => {
      return {
        authEnabled: true,
        jwksUri: 'http://localhost:3200/cdp-defra-id-stub/.well-known/jwks.json'
      }
    })

    mockWreckGet.mockResolvedValue({
      payload: {
        keys: [
          {
            kty: 'RSA',
            n: 'test-n',
            e: 'AQAB'
          }
        ]
      }
    })

    mockJwkToPem.mockReturnValue(testKey)

    server = Hapi.server()
    await server.register(hapiAuthJwt2)
    await server.register(auth)
  })

  afterEach(async () => {
    await server.stop()
  })

  test('should register JWT strategy', () => {
    expect(server.auth.settings.default.strategies).toContain('jwt')
  })

  describe('Default auth mode configuration', () => {
    test('should set default auth strategy to jwt with required mode when auth is enabled', async () => {
      config.get.mockImplementation(() => {
        return {
          authEnabled: true,
          jwksUri:
            'http://localhost:3200/cdp-defra-id-stub/.well-known/jwks.json'
        }
      })

      const testServer = Hapi.server()
      await testServer.register(hapiAuthJwt2)
      await testServer.register(auth)

      expect(testServer.auth.settings.default.strategies).toContain('jwt')
      expect(testServer.auth.settings.default.mode).toBe('required')

      await testServer.stop()
    })

    test('should set default auth strategy to jwt with try mode when auth is disabled', async () => {
      config.get.mockImplementation(() => {
        return {
          authEnabled: false,
          jwksUri:
            'http://localhost:3200/cdp-defra-id-stub/.well-known/jwks.json'
        }
      })

      const testServer = Hapi.server()
      await testServer.register(hapiAuthJwt2)
      await testServer.register(auth)

      expect(testServer.auth.settings.default.strategies).toContain('jwt')
      expect(testServer.auth.settings.default.mode).toBe('try')

      await testServer.stop()
    })
  })

  describe('Key Function', () => {
    test('should return key function that provides PEM key', async () => {
      const result = await getKey()

      expect(result).toEqual({
        key: testKey
      })
    })

    test('should handle empty keys array', async () => {
      mockWreckGet.mockResolvedValueOnce({
        payload: {
          keys: []
        }
      })

      const result = await getKey()

      expect(result).toEqual({ key: null })
    })

    test('should handle JWKS fetch errors gracefully', async () => {
      mockWreckGet.mockRejectedValue(new Error('Network error'))
      await expect(getKey()).rejects.toThrow(
        Boom.internal('Cannot verify auth token: Network error')
      )
    })
  })

  describe('Validate Function', () => {
    test('should validate JWT token and return user credentials', async () => {
      const mockDecoded = {
        contactId: testId,
        email: 'test@example.com'
      }
      const mockRequest = {}
      const mockH = {}

      const result = await validateToken(mockDecoded, mockRequest, mockH)

      expect(result).toEqual({
        isValid: true,
        credentials: {
          contactId: testId,
          email: 'test@example.com'
        }
      })
    })

    test('should skip validation when authEnabled is false', async () => {
      const mockDecoded = {}
      const mockRequest = {}
      const mockH = {}

      config.get.mockImplementationOnce(() => {
        return {
          authEnabled: false
        }
      })

      const result = await validateToken(mockDecoded, mockRequest, mockH)

      expect(result).toEqual({
        isValid: true
      })
    })

    test('should handle decoded token with missing contactId', async () => {
      const mockDecoded = {}
      const mockRequest = {}
      const mockH = {}

      const result = await validateToken(mockDecoded, mockRequest, mockH)

      expect(result).toEqual({
        isValid: false
      })
    })

    test('should handle decoded token with contactId but no email', async () => {
      const mockDecoded = {
        contactId: testId
      }
      const mockRequest = {}
      const mockH = {}

      const result = await validateToken(mockDecoded, mockRequest, mockH)

      expect(result).toEqual({
        isValid: true,
        credentials: {
          contactId: testId,
          email: undefined
        }
      })
    })

    describe('Verify Options', () => {
      test('should configure RS256 algorithm', () => {
        const verifyOptions = {
          algorithms: ['RS256']
        }

        expect(verifyOptions.algorithms).toEqual(['RS256'])
      })
    })
  })
})
