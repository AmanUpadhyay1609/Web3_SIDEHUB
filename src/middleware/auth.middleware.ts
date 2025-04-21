import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  _id?: string;
}

const verifyAccessToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.accessToken || 
                 req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No token provided'
      });
    }

    const decodedToken : any = jwt.verify(token, process.env.JWT_AUTH as string) as JwtPayload;
    console.log("the decoded token",decodedToken)

    if (!decodedToken || !decodedToken.chatId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid token'
      });
    }

    next();
  } catch (error: unknown) {
    let errorMessage = 'Authentication failed';
    
    if (error instanceof jwt.JsonWebTokenError) {
      errorMessage = 'Invalid token';
    } else if (error instanceof jwt.TokenExpiredError) {
      errorMessage = 'Token expired';
    }

    console.error('Authentication Error:', error instanceof Error ? error.message : error);
    
    return res.status(401).json({
      success: false,
      message: `Unauthorized: ${errorMessage}`
    });
  }
};

export { verifyAccessToken };