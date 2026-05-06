import { Configuration, PublicClientApplication, LogLevel } from '@azure/msal-browser';

// Reemplazar por las variables de entorno
const clientId = (import.meta.env.VITE_AZURE_CLIENT_ID || 'client-id-placeholder').trim();
const tenantId = (import.meta.env.VITE_AZURE_TENANT_ID || 'common').trim();

export const msalConfig: Configuration = {
  auth: {
    clientId: clientId, // 'Application (client) ID' of app registration in Azure portal
    authority: `https://login.microsoftonline.com/${tenantId}`, 
    redirectUri: window.location.origin, // Puesto dinámicamente al origin actual
  },
  cache: {
    cacheLocation: 'localStorage', 
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            // console.info(message);
            return;
          case LogLevel.Verbose:
            // console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
          default:
            return;
        }
      },
    },
  },
};

// Permisos necesarios para interactuar con MS Teams y Grupos
export const graphScopes = {
  scopes: [
    'User.Read', 
    'User.ReadBasic.All', 
    'Group.ReadWrite.All', 
    'Directory.ReadWrite.All'
  ],
};

export const msalInstance = new PublicClientApplication(msalConfig);

let isMsalInitialized = false;
let msalInitPromise: Promise<void> | null = null;

// Inicializar la instancia si aún no lo ha hecho de forma perezosa
export const initializeMsal = async () => {
    if (isMsalInitialized) return;
    if (msalInitPromise) return msalInitPromise;
    
    msalInitPromise = (async () => {
        try {
            await msalInstance.initialize();
            await msalInstance.handleRedirectPromise().catch(e => {
                // Ignore cache errors in popup window
                if (e.errorCode === 'no_token_request_cache_error' && window.opener) {
                    console.warn("Expected cache error in popup window, safely ignoring.");
                    return;
                }
                throw e;
            });
            isMsalInitialized = true;
        } catch (e) {
            console.error("MSAL Initialization Error:", e);
        }
    })();
    return msalInitPromise;
};
