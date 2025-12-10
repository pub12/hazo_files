/**
 * Custom error classes for hazo_files
 */

export class HazoFilesError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'HazoFilesError';
  }
}

export class FileNotFoundError extends HazoFilesError {
  constructor(path: string) {
    super(`File not found: ${path}`, 'FILE_NOT_FOUND', { path });
    this.name = 'FileNotFoundError';
  }
}

export class DirectoryNotFoundError extends HazoFilesError {
  constructor(path: string) {
    super(`Directory not found: ${path}`, 'DIRECTORY_NOT_FOUND', { path });
    this.name = 'DirectoryNotFoundError';
  }
}

export class FileExistsError extends HazoFilesError {
  constructor(path: string) {
    super(`File already exists: ${path}`, 'FILE_EXISTS', { path });
    this.name = 'FileExistsError';
  }
}

export class DirectoryExistsError extends HazoFilesError {
  constructor(path: string) {
    super(`Directory already exists: ${path}`, 'DIRECTORY_EXISTS', { path });
    this.name = 'DirectoryExistsError';
  }
}

export class DirectoryNotEmptyError extends HazoFilesError {
  constructor(path: string) {
    super(`Directory is not empty: ${path}`, 'DIRECTORY_NOT_EMPTY', { path });
    this.name = 'DirectoryNotEmptyError';
  }
}

export class PermissionDeniedError extends HazoFilesError {
  constructor(path: string, operation: string) {
    super(`Permission denied for ${operation} on: ${path}`, 'PERMISSION_DENIED', { path, operation });
    this.name = 'PermissionDeniedError';
  }
}

export class InvalidPathError extends HazoFilesError {
  constructor(path: string, reason: string) {
    super(`Invalid path "${path}": ${reason}`, 'INVALID_PATH', { path, reason });
    this.name = 'InvalidPathError';
  }
}

export class FileTooLargeError extends HazoFilesError {
  constructor(path: string, size: number, maxSize: number) {
    super(
      `File "${path}" is too large (${size} bytes). Maximum allowed: ${maxSize} bytes`,
      'FILE_TOO_LARGE',
      { path, size, maxSize }
    );
    this.name = 'FileTooLargeError';
  }
}

export class InvalidExtensionError extends HazoFilesError {
  constructor(path: string, extension: string, allowedExtensions: string[]) {
    super(
      `File extension "${extension}" is not allowed. Allowed: ${allowedExtensions.join(', ')}`,
      'INVALID_EXTENSION',
      { path, extension, allowedExtensions }
    );
    this.name = 'InvalidExtensionError';
  }
}

export class AuthenticationError extends HazoFilesError {
  constructor(provider: string, message: string) {
    super(`Authentication failed for ${provider}: ${message}`, 'AUTHENTICATION_ERROR', { provider });
    this.name = 'AuthenticationError';
  }
}

export class ConfigurationError extends HazoFilesError {
  constructor(message: string) {
    super(`Configuration error: ${message}`, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
  }
}

export class OperationError extends HazoFilesError {
  constructor(operation: string, message: string, details?: Record<string, unknown>) {
    super(`${operation} failed: ${message}`, 'OPERATION_ERROR', details);
    this.name = 'OperationError';
  }
}
