export class NotLoggedInError extends Error {
  constructor(message = 'Not logged in. Run `insighta login` to authenticate.') {
    super(message);
    this.name = 'NotLoggedInError';
  }
}

export class ForbiddenError extends Error {
  role: string;
  constructor(role: string) {
    super(`Permission denied: this operation requires a higher-privileged role. Your current role is \`${role}\`.`);
    this.name = 'ForbiddenError';
    this.role = role;
  }
}

export class NotFoundError extends Error {
  id: string;
  constructor(id: string) {
    super(`No profile found with ID \`${id}\`.`);
    this.name = 'NotFoundError';
    this.id = id;
  }
}

export class ValidationError extends Error {
  details: Record<string, string[]>;
  constructor(message: string, details: Record<string, string[]> = {}) {
    super(`Validation failed: ${message}`);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class RateLimitError extends Error {
  retryAfter?: number;
  constructor(retryAfter?: number) {
    const msg = retryAfter != null
      ? `Rate limited. Please wait ${retryAfter} seconds before retrying.`
      : 'Rate limited. Please try again later.';
    super(msg);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class NetworkError extends Error {
  constructor(operation: string, details: string) {
    super(`Network error: ${operation} failed — ${details}`);
    this.name = 'NetworkError';
  }
}

export class ExportError extends Error {
  constructor(message = 'Export failed: the server returned an empty or malformed response.') {
    super(message);
    this.name = 'ExportError';
  }
}

export class TimeoutError extends Error {
  constructor(message = 'Login timed out. The browser flow was not completed within 5 minutes.') {
    super(message);
    this.name = 'TimeoutError';
  }
}
