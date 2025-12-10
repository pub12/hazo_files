/**
 * Module Registry
 * Central registry for all storage modules
 */

import type { StorageModule, StorageProvider, HazoFilesConfig } from '../types';
import { createLocalModule } from './local';
import { createGoogleDriveModule } from './google-drive';
import { ConfigurationError } from '../common/errors';

/**
 * Factory function type for creating modules
 */
type ModuleFactory = () => StorageModule;

/**
 * Registry of available storage modules
 */
const moduleRegistry: Record<StorageProvider, ModuleFactory> = {
  local: createLocalModule,
  google_drive: createGoogleDriveModule,
};

/**
 * Get a list of registered providers
 */
export function getRegisteredProviders(): StorageProvider[] {
  return Object.keys(moduleRegistry) as StorageProvider[];
}

/**
 * Check if a provider is registered
 */
export function isProviderRegistered(provider: string): provider is StorageProvider {
  return provider in moduleRegistry;
}

/**
 * Create a storage module instance for the given provider
 */
export function createModule(provider: StorageProvider): StorageModule {
  const factory = moduleRegistry[provider];
  if (!factory) {
    throw new ConfigurationError(`Unknown storage provider: ${provider}`);
  }
  return factory();
}

/**
 * Create and initialize a storage module with configuration
 */
export async function createAndInitializeModule(config: HazoFilesConfig): Promise<StorageModule> {
  const module = createModule(config.provider);
  await module.initialize(config);
  return module;
}

/**
 * Register a custom module (for extensibility)
 */
export function registerModule(provider: StorageProvider, factory: ModuleFactory): void {
  moduleRegistry[provider] = factory;
}

// Export module classes and factories
export { LocalStorageModule, createLocalModule } from './local';
export { GoogleDriveModule, createGoogleDriveModule, GoogleDriveAuth, createGoogleDriveAuth } from './google-drive';
export type { TokenData, AuthCallbacks, GoogleAuthConfig } from './google-drive';
