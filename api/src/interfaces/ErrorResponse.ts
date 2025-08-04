import MessageResponse from './MessageResponse';

export interface ErrorResponse extends MessageResponse {
  errorCode: string;
  stack?: string;
  details?: Record<string, any>;
}

export default ErrorResponse;
