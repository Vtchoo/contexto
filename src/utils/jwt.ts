import jwt from 'jsonwebtoken'

// JWT secret - in production this should be from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'contexto-secret-key-change-in-production'

// JWT expiration time
const JWT_EXPIRES_IN = '30d'

export interface JWTPayload {
  userId: string
  iat?: number
  exp?: number
}

export class JWTService {
  /**
   * Generate a JWT token with user ID in payload
   */
  static generateToken(userId: string): string {
    const payload: JWTPayload = {
      userId
    }

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'contexto-app',
      audience: 'contexto-users'
    })
  }

  /**
   * Verify and decode a JWT token
   */
  static verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'contexto-app',
        audience: 'contexto-users'
      }) as JWTPayload

      return decoded
    } catch (error) {
      console.error('JWT verification failed:', error)
      return null
    }
  }

  /**
   * Decode a JWT token without verification (for debugging)
   */
  static decodeToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload
      return decoded
    } catch (error) {
      console.error('JWT decode failed:', error)
      return null
    }
  }

  /**
   * Check if a token is expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token)
      if (!decoded || !decoded.exp) return true

      const now = Math.floor(Date.now() / 1000)
      return decoded.exp < now
    } catch (error) {
      return true
    }
  }

  /**
   * Refresh a token if it's valid but close to expiration
   */
  static refreshTokenIfNeeded(token: string): string | null {
    try {
      const decoded = this.verifyToken(token)
      if (!decoded) return null

      // Refresh if token expires in less than 7 days
      const sevenDaysFromNow = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
      if (decoded.exp && decoded.exp < sevenDaysFromNow) {
        return this.generateToken(decoded.userId)
      }

      return token // Token is still fresh
    } catch (error) {
      return null
    }
  }
}

export default JWTService
