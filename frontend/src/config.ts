export interface AppConfig {
  api_url: string;
  app_name: string;
  environment: string;
}

const defaultConfig: AppConfig = {
  api_url: 'http://localhost:8000/api/v1',
  app_name: 'QA Project Mgmt',
  environment: 'development',
};

let currentConfig: AppConfig = { ...defaultConfig };

export async function loadAppConfig(): Promise<AppConfig> {
  try {
    const response = await fetch('/app-config.json');
    if (response.ok) {
      const data = await response.json();
      currentConfig = { ...defaultConfig, ...data };
    }
  } catch (err) {
    console.warn('No se pudo cargar app-config.json, usando configuración por defecto:', err);
  }
  return currentConfig;
}

export function getAppConfig(): AppConfig {
  return currentConfig;
}
