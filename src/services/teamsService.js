import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

// Evitar caché globalmente en las peticiones (usar headers específicos cuando sea necesario)
axios.defaults.headers.common['Cache-Control'] = 'no-cache';

const TENANT_ID = process.env.AZURE_TENANT_ID;
const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;

const GRAPH_URL = "https://graph.microsoft.com/v1.0";

// 🔐 Obtener token (Client Credentials)
export async function obtenerToken() {
  try {
    if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
      throw new Error("Faltan credenciales de Azure (Tenant/Client/Secret). Revisa el archivo .env o la configuración.");
    }

    const res = await axios.post(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    return res.data.access_token;
  } catch (error) {
    console.error("Error obteniendo token:", error.response?.data || error.message);
    throw new Error(`Error de autenticación con Azure AD: ${error.message}`);
  }
}

// 🧠 Crear grupo (base para el Team)
async function crearGrupo(token, mailNickname, { displayName, description, owners, members }) {
  // Preparar owners y members en formato odata.bind verificando que no sean nulos o vacíos
  const ownersPayload = (owners || []).filter(id => id).map(id => `${GRAPH_URL}/users/${id}`);
  const membersPayload = (members || []).filter(id => id).map(id => `${GRAPH_URL}/users/${id}`);

  try {
    const res = await axios.post(
      `${GRAPH_URL}/groups`,
      {
        displayName,
        description: description || "Creado desde EduCore",
        mailEnabled: true,
        mailNickname,
        securityEnabled: false,
        groupTypes: ["Unified"],
        "owners@odata.bind": ownersPayload,
        "members@odata.bind": [...new Set([...ownersPayload, ...membersPayload])], // Incluir owners como miembros también
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
      }
    );
    
    let groupId = res.data?.id;

    // Si un interceptor/SW devuelve 204 sin id, hacemos polling hasta que aparezca realmente en Azure
    if (!groupId || res.status === 204) {
      console.log(`[Teams Service Audit] Respuesta 204 detectada o sin ID en POST /groups. Iniciando recuperación de ID por nickname...`);
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 4000));
        try {
          console.log(`[Teams Service Audit] Polling verificando creación real del grupo ${mailNickname} (${i + 1}/15)...`);
          const searchRes = await axios.get(`${GRAPH_URL}/groups?$filter=mailNickname eq '${mailNickname}'`, {
            headers: { 
              Authorization: `Bearer ${token}`, 
              "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate", 
              "Pragma": "no-cache" 
            }
          });
          if (searchRes.data && searchRes.data.value && searchRes.data.value.length > 0) {
            groupId = searchRes.data.value[0].id;
            console.log(`[Teams Service Audit] Grupo confirmado en Azure AD tras polling: ${groupId}`);
            break;
          }
        } catch (e) {
          console.warn(`[Teams Service Audit] Error en polling de búsqueda: ${e.message}`);
        }
      }
    }

    if (!groupId) {
      console.error(`[Teams Service Audit] ERROR: No se pudo recuperar el ID del grupo tras polling.`);
      throw new Error("Timeout: No se pudo obtener el ID del grupo creado de Azure AD.");
    }

    return groupId;
  } catch (error) {
    console.error("Error creando grupo:", error.response?.data || error.message);
    throw new Error(`No se pudo crear el grupo base: ${JSON.stringify(error.response?.data || error.message)}`);
  }
}

// 🔄 Actualizar miembros de un grupo existente
async function actualizarMiembros(token, groupId, { owners, members }) {
  const cleanGroupId = String(groupId).trim();
  const ownersPayload = (owners || []).filter(id => id).map(id => `${GRAPH_URL}/users/${String(id).trim()}`);
  const membersPayload = (members || []).filter(id => id).map(id => `${GRAPH_URL}/users/${String(id).trim()}`);
  
  if (ownersPayload.length === 0 && membersPayload.length === 0) return;

  try {
    const payload = {};
    if (ownersPayload.length > 0) payload["owners@odata.bind"] = ownersPayload;
    if (membersPayload.length > 0) payload["members@odata.bind"] = [...new Set([...ownersPayload, ...membersPayload])];

    await axios.patch(
      `${GRAPH_URL}/groups/${cleanGroupId}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`[Teams] Miembros actualizados exitosamente en el grupo ${cleanGroupId}.`);
  } catch (error) {
    console.warn(`[Teams] Fallo al actualizar miembros (posiblemente ya existían):`, error.response?.data || error.message);
  }
}

// 🚀 Convertir grupo a Team
async function convertirATeam(token, groupId, template = 'standard') {
  const maxRetries = 10; 
  const retryDelay = 15000; 
  const cleanGroupId = String(groupId).trim();

  console.log(`[Teams Service Audit] Iniciando espera forzada de 10s para el grupo ${cleanGroupId} antes de activación...`);
  await new Promise(resolve => setTimeout(resolve, 10000));

  for (let i = 0; i < maxRetries; i++) {
    try {
      // 1. Verificación previa
      console.log(`[Teams Service Audit] Verificando existencia real del grupo ${cleanGroupId} (Intento ${i + 1}/${maxRetries})...`);
      try {
        await axios.get(`${GRAPH_URL}/groups/${cleanGroupId}`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Pragma": "no-cache"
          }
        });
      } catch (e) {
        if (e.response && e.response.status === 404) {
          console.warn(`[Teams Service Audit] El grupo ${cleanGroupId} aún no es visible vía GET.`);
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue; 
          }
        }
        throw e;
      }

      // 2. Intento de activación de Teams (SIN query strings)
      const payload = {
        "template@odata.bind": `https://graph.microsoft.com/v1.0/teamsTemplates('${template}')`
      };

      const res = await axios.put(
        `${GRAPH_URL}/groups/${cleanGroupId}/team`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Cache-Control": "no-cache"
          },
        }
      );

      if (res.status === 201 || res.status === 202) {
        console.log(`[Teams Service Audit] Activación exitosa (o aceptada) para el grupo ${cleanGroupId}.`);
        return cleanGroupId;
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      const isTransient = error.response && (error.response.status === 404 || error.response.status === 400 || error.response.status === 409);
      
      if (isTransient) {
        console.warn(`[Teams Service Audit] Error transitorio (status ${error.response.status}) para ${cleanGroupId}: ${errorMsg}. Reintentando...`);
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
      }
      
      throw new Error(`Error al activar Teams para el grupo ${cleanGroupId} tras ${i + 1} intentos: ${errorMsg}`);
    }
  }
  return cleanGroupId;
}

// ⏳ Esperar a que exista en Teams (Provisionamiento)
async function esperarProvisionamiento(token, groupId) {
  const maxIntentos = 15;
  const delay = 4000;

  console.log(`[Teams] Esperando a que el equipo ${groupId} esté totalmente aprovisionado...`);

  for (let i = 0; i < maxIntentos; i++) {
    try {
      const res = await axios.get(`${GRAPH_URL}/teams/${groupId}`, {
        headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-cache", "Pragma": "no-cache" },
      });

      if (res.status === 200) {
        console.log(`[Teams] Equipo ${groupId} listo.`);
        return true;
      }
    } catch (error) {
      // 404 es esperado mientras se aprovisiona
    }
    await new Promise((r) => setTimeout(r, delay));
  }

  return false; // No fallamos catastróficamente, pero indicamos que no se confirmó
}

// 🎯 FUNCIONES POR ETAPAS (Para UI por pasos)
export async function crearGrupoBase({ displayName, description, teachers, students }) {
  const token = await obtenerToken();
  const mailNickname = displayName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().substring(0, 64);
  
  console.log(`[Teams Service Audit] Creando grupo base por separado: ${displayName}`);
  
  let groupId;
  // Intentar buscar si existe
  try {
    const searchRes = await axios.get(`${GRAPH_URL}/groups?$filter=mailNickname eq '${mailNickname}'`, {
       headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-cache", "Pragma": "no-cache" }
    });
    if (searchRes.data.value && searchRes.data.value.length > 0) {
       groupId = searchRes.data.value[0].id;
       console.log(`[Teams Service Audit] Grupo existente encontrado por Nickname: ${groupId}`);
       await actualizarMiembros(token, groupId, { owners: teachers, members: students });
       return { success: true, id: groupId, new: false };
    }
  } catch (e) {
    console.warn("Error buscando grupo en crearGrupoBase:", e.message);
  }

  groupId = await crearGrupo(token, mailNickname, { 
    displayName, 
    description, 
    owners: teachers, 
    members: students 
  });

  return { success: true, id: groupId, new: true };
}

export async function activarTeamsParaGrupo(groupId, template = 'standard') {
  const token = await obtenerToken();
  console.log(`[Teams Service Audit] Activando capa de Teams para el grupo: ${groupId}`);
  
  await convertirATeam(token, groupId, template);
  const isReady = await esperarProvisionamiento(token, groupId);

  return { success: true, id: groupId, provisioned: isReady };
}

// 🎯 FUNCIÓN PRINCIPAL (Mantener compatibilidad)
export async function crearEquipo(payload) {
  const { 
    displayName, 
    description, 
    teachers, 
    students, 
    template = 'standard',
    subjects = []
  } = payload;

  try {
    const token = await obtenerToken();
    const mailNickname = displayName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().substring(0, 64);

    console.log(`[Teams] Paso 1: Buscando o creando grupo para '${displayName}'...`);
    
    let groupId;
    let isNewGroup = false;

    // Buscar si el grupo ya existe por mailNickname
    try {
      const searchRes = await axios.get(`${GRAPH_URL}/groups?$filter=mailNickname eq '${mailNickname}'`, {
         headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-cache", "Pragma": "no-cache" }
      });
      if (searchRes.data.value && searchRes.data.value.length > 0) {
         groupId = searchRes.data.value[0].id;
         console.log(`[Teams Service] Grupo detectado por Nickname. Evitando duplicado con ID: ${groupId}`);
         
         // Actualizar miembros del grupo existente
         console.log(`[Teams] Actualizando miembros del grupo existente...`);
         await actualizarMiembros(token, groupId, { owners: teachers, members: students });
      }
    } catch (e) {
      console.warn("Búsqueda de grupo falló, se intentará crear nuevo.", e.message);
    }

    if (!groupId) {
      console.log(`[Teams Service] Creando grupo nuevo con Nickname único: ${mailNickname}`);
      groupId = await crearGrupo(token, mailNickname, { 
        displayName, 
        description, 
        owners: teachers, 
        members: students 
      });
      isNewGroup = true;
    }

    const waitTime = isNewGroup ? 20000 : 5000;
    console.log(`[Teams] Esperando ${waitTime / 1000} segundos para propagación en Azure AD antes de activar Teams...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));

    console.log(`[Teams] Paso 2: Convirtiendo obligatoriamente grupo ${groupId} a Team mediante PUT...`);
    try {
      await convertirATeam(token, groupId, template);
      console.log(`[Teams] Petición PUT /groups/${groupId}/team exitosa o en proceso.`);
    } catch (conversionError) {
      console.error('[Teams] Error en la conversión:', conversionError.response?.data || conversionError.message || conversionError);
      return {
        success: false,
        id: groupId,
        provisioned: false,
        message: "El grupo de Azure se creó pero la capa de Teams falló."
      };
    }

    console.log(`[Teams] Paso 3: Esperando aprovisionamiento final...`);
    const isReady = await esperarProvisionamiento(token, groupId);

    // Opcional: Crear canales para materias
    if (isReady && subjects.length > 0) {
       console.log(`[Teams] Paso 4: Creando canales para ${subjects.length} materias...`);
       for (const subject of subjects) {
         try {
           await axios.post(`${GRAPH_URL}/teams/${groupId}/channels`, {
             displayName: String(subject).substring(0, 50).replace(/[#%&*{}\\<>?\/|'"~]/g, ''),
             isFavoriteByDefault: true
           }, {
             headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
           });
         } catch (e) {
           console.warn(`No se pudo crear canal para ${subject}:`, e.message);
         }
       }
    }

    return {
      success: true,
      id: groupId,
      provisioned: isReady,
      message: isReady ? "Equipo creado y listo" : "Equipo creado pero el aprovisionamiento de Teams está tardando"
    };

  } catch (error) {
    console.error("[Teams] Error en flujo de creación:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.error?.message || error.message,
      provisioned: false,
    };
  }
}

