import { Client } from '@microsoft/microsoft-graph-client';
import { msalInstance, graphScopes, initializeMsal } from '../lib/azure-auth';

/**
 * Obtener un token de acceso válido de MSAL.
 * Útil para inicializar el cliente de Microsoft Graph
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    await initializeMsal();

    const account = msalInstance.getAllAccounts()[0];
    if (!account) {
      console.warn("No hay cuenta de Azure activa. Ejecutando loginPopup...");
      try {
        const loginResponse = await msalInstance.loginPopup(graphScopes);
        return loginResponse.accessToken;
      } catch (loginError: any) {
        if (loginError?.errorCode === "interaction_in_progress" || loginError?.message?.includes("interaction_in_progress")) {
          throw new Error("Una autenticación de Azure ya está en curso. Por favor completa la ventana emergente.");
        }
        console.error("loginPopup failed:", loginError);
        throw new Error("No hay cuenta de Azure activa. Inicie sesión primero.");
      }
    }
    
    // Intenta adquirir el token de forma silenciosa primero
    const response = await msalInstance.acquireTokenSilent({
      ...graphScopes,
      account: account
    });
    
    return response.accessToken;
  } catch (error: any) {
    if (error?.errorCode === "interaction_in_progress" || error?.message?.includes("interaction_in_progress")) {
        throw new Error("Una autenticación ya está en curso. Por favor, completa o cierra la ventana emergente.");
    }
    console.warn("Silent token acquisition failed. Acquiring via popup", error);
    // Si falla silenciosamente (por ej. token expirado o no consentido), usar un pop-up
    try {
        const response = await msalInstance.acquireTokenPopup(graphScopes);
        return response.accessToken;
    } catch(popupError: any) {
        if (popupError?.errorCode === "interaction_in_progress" || popupError?.message?.includes("interaction_in_progress")) {
            throw new Error("Una autenticación ya está en curso. Por favor, completa o cierra la ventana emergente.");
        }
        console.error("Popup token acquisition failed:", popupError);
        return null;
    }
  }
}

/**
 * Inicializa y obtiene un cliente de Microsoft Graph configurado
 */
export async function getGraphClient(): Promise<Client> {
  const token = await getAccessToken();
  
  if (!token) {
    throw new Error("No hay cuenta de Azure activa o la autenticación falló/fue rechazada.");
  }

  return Client.init({
    authProvider: (done) => {
      done(null, token);
    }
  });
}

/**
 * Wrapper de funcionalidades comunes para MS Teams
 */
export const MicrosoftTeamsService = {
  
  /**
   * Crear un nuevo MS Team (M365 Group + Team) e incluir canales basados en materias
   */
  async createTeam(displayName: string, description: string, subjects: string[] = [], ownerEmails: string[] = [], memberEmails: string[] = []) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 seconds timeout

    try {
      const response = await fetch(`/api/teams/create`, {
        method: "POST",
        signal: controller.signal,
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache"
        },
        body: JSON.stringify({ 
          displayName, 
          description, 
          subjects, 
          ownerEmails, 
          memberEmails,
          forceRefresh: true,
          timestamp: Date.now()
        })
      });
      
      clearTimeout(timeoutId);

      if (response.status === 204) {
        throw new Error("El servidor devolvió un estado 204 (No Content). Es posible que la petición haya sido interceptada o el servidor no haya respondido correctamente.");
      }

      if (!response.ok) {
          const errorText = await response.text();
          let err;
          try { 
              err = JSON.parse(errorText); 
          } catch { 
              err = errorText; 
          }
          throw new Error(`Failed to create team: ${JSON.stringify(err)}`);
      }
      
      const data = await response.json();
      if (!data || typeof data !== 'object') {
         throw new Error("El servidor no devolvió un JSON válido.");
      }
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error("La petición de creación de equipo excedió el tiempo límite de 90 segundos.");
      }
      throw error;
    }
  },
  
  /**
   * PASO 1: Solo crear el grupo en Azure AD (sin activar Teams aún)
   */
  async createGroupOnly(displayName: string, description: string, ownerEmails: string[] = [], memberEmails: string[] = []) {
    const response = await fetch(`/api/teams/create-group`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      },
      body: JSON.stringify({ displayName, description, ownerEmails, memberEmails })
    });
    
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Fallo al crear el grupo base en Azure");
    }
    
    return await response.json();
  },

  /**
   * PASO 2: Activar la capa de Teams llamando al backend
   */
  async activateTeamOnly(groupId: string, template: string = 'standard') {
    try {
      const response = await fetch(`/api/teams/activate-team`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        },
        body: JSON.stringify({ groupId, template })
      });
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(err.error || "Fallo al activar Teams para este grupo");
      }
      
      return await response.json();
    } catch (error: any) {
      console.error("[Graph Service] activateTeamOnly failed:", error);
      throw error;
    }
  },

  /**
   * Agregar un miembro (estudiante/profesor) a un Team mediante su Email 
   */
  async addMemberToTeam(teamId: string, userPrincipalName: string, role: "owner" | "member" = "member") {
    // Implement or leave graph client logic here if needed
    // The user didn't ask to change this specifically but it might fail without login.
    // For now we keep it using the graph client
    const client = await getGraphClient();

    const user = await client.api(`/users/${userPrincipalName}`).get();
    
    if (!user || !user.id) {
        throw new Error(`User ${userPrincipalName} not found in Azure AD.`);
    }

    const memberPayload = {
      "@odata.type": "#microsoft.graph.aadUserConversationMember",
      "roles": role === 'owner' ? ["owner"] : [],
      "user@odata.bind": `https://graph.microsoft.com/v1.0/users('${user.id}')`
    };

    return await client.api(`/teams/${teamId}/members`).post(memberPayload);
  },

  /**
   * Crear una publicación en el canal (asignación de actividad) 
   */
  async createActivityMessage(groupName: string, subjectName: string, activityName: string, ms_team_id?: string) {
    try {
      const response = await fetch(`/api/teams/notify`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        },
        body: JSON.stringify({ groupName, subjectName, activityName, ms_team_id })
      });

      if (!response.ok) throw new Error("Failed to notify Teams.");
      return true;
    } catch (e) {
      console.warn("No se pudo crear el mensaje de asignación en Teams", e);
      return false;
    }
  },

  /**
   * Obtener lista de equipos del usuario actual
   */
  async getMyTeams() {
    const client = await getGraphClient();
    const result = await client.api('/me/joinedTeams').get();
    return result.value;
  }
};
