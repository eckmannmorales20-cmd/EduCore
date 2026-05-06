import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { crearEquipo, crearGrupoBase, activarTeamsParaGrupo } from "./src/services/teamsService.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper to get Graph API app-only token using Client Credentials Flow
  async function getAppAccessToken() {
    const tenantId = (process.env.AZURE_TENANT_ID || 'common').trim();
    const clientId = (process.env.AZURE_CLIENT_ID || '').trim();
    const clientSecret = (process.env.AZURE_CLIENT_SECRET || '').trim();

    if (!clientId || !clientSecret) {
      throw new Error("AZURE_CLIENT_ID or AZURE_CLIENT_SECRET is missing in environment variables");
    }

    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const body = new URLSearchParams({
      client_id: clientId,
      scope: 'https://graph.microsoft.com/.default',
      client_secret: clientSecret,
      grant_type: 'client_credentials'
    });

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString()
    });

    if (!response.ok) {
        const err = await response.text();
        console.error("Token error:", err);
        throw new Error("Failed to acquire application token");
    }

    const data = await response.json();
    return data.access_token;
  }

  // API rutas
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/graph/test", async (req, res) => {
    try {
      console.log("[Graph Test] Iniciando prueba de conexión...");
      const token = await getAppAccessToken();
      console.log("[Graph Test] Token obtenido con éxito.");

      // Probar una consulta simple a la organización
      const graphRes = await fetch("https://graph.microsoft.com/v1.0/organization", {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!graphRes.ok) {
        const errorText = await graphRes.text();
        console.error("[Graph Test] Error al consultar Graph:", errorText);
        return res.status(graphRes.status).json({
          success: false,
          stage: "API Query",
          error: errorText
        });
      }

      const data = await graphRes.json();
      console.log("[Graph Test] Conexión exitosa. Organización encontrada.");
      
      res.json({
        success: true,
        message: "Conexión con Microsoft Graph establecida correctamente.",
        organization: data.value?.[0]?.displayName || "Desconocida",
        tenantId: data.value?.[0]?.id
      });
    } catch (error: any) {
      console.error("[Graph Test] Error crítico:", error.message);
      res.status(500).json({
        success: false,
        stage: "Authentication",
        error: error.message
      });
    }
  });

  app.get("/api/graph/users/search", async (req, res) => {
    try {
      const q = req.query.q as string;
      if (!q) return res.status(400).json({ error: "Missing query parameter 'q'" });

      const token = await getAppAccessToken();
      const filter = `userPrincipalName eq '${q}' or mail eq '${q}' or displayName eq '${q}' or startsWith(displayName, '${q}')`;
      
      const userRes = await fetch(`https://graph.microsoft.com/v1.0/users?$filter=${encodeURIComponent(filter)}&$select=id,displayName,userPrincipalName,mail`, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "ConsistencyLevel": "eventual" 
        }
      });

      const data = await userRes.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/teams/create", async (req, res) => {
    // Establecer headers de no caché inmediatamente
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');

    try {
      const { displayName, description, subjects, ownerEmails, memberEmails, forceRefresh, timestamp } = req.body;
      
      console.log(`[Teams Audit] Iniciando proceso para: ${displayName} (forceRefresh: ${forceRefresh || false}, ts: ${timestamp || 'N/A'})`);
      const token = await getAppAccessToken();

      // Función para resolver correos a IDs de Azure AD
      const resolveToIds = async (emails: string[]) => {
        const ids: string[] = [];
        console.log(`[Teams Audit] Resolviendo correos: ${emails.join(', ')}`);
        // ... rest of resolveToIds logic ...
        for (const email of (emails || [])) {
          if (!email) continue;
          try {
            const cleanEmail = email.trim().replace(/'/g, "''");
            const filter = `userPrincipalName eq '${cleanEmail}' or mail eq '${cleanEmail}' or displayName eq '${cleanEmail}'`;
            const userRes = await fetch(`https://graph.microsoft.com/v1.0/users?$filter=${encodeURIComponent(filter)}&$select=id,userPrincipalName,displayName`, {
              headers: { 
                "Authorization": `Bearer ${token}`,
                "ConsistencyLevel": "eventual",
                "Cache-Control": "no-cache"
              }
            });
            
            if (userRes.ok) {
              const userData = await userRes.json();
              if (userData.value && userData.value.length > 0) {
                const foundId = userData.value[0].id;
                console.log(`[Teams Audit] Usuario resuelto: ${cleanEmail} -> ${foundId}`);
                ids.push(foundId);
              } else {
                console.warn(`[Teams Audit] NO encontrado en Azure AD: ${cleanEmail}`);
              }
            } else {
              const txt = await userRes.text();
              console.error(`[Teams Audit] Error API Graph resolviendo ${cleanEmail}:`, txt);
            }
          } catch (e) {
            console.error(`[Teams Audit] Excepción resolviendo ${email}:`, e);
          }
        }
        return ids;
      };

      console.log(`[Teams Audit] Iniciando resolución de identidades...`);
      const resolvedOwners = await resolveToIds(ownerEmails);
      const resolvedMembers = await resolveToIds(memberEmails);

      if (resolvedOwners.length === 0) {
        console.error("[Teams Audit] Error CRÍTICO: No se resolvieron propietarios.");
        return res.status(400).json({ 
          error: "No se pudieron resolver los propietarios en Azure AD.",
          details: `Emails intentados: ${ownerEmails.join(', ')}`
        });
      }

      console.log(`[Teams Audit] Llamando a crearEquipo con ${resolvedOwners.length} owners y ${resolvedMembers.length} alumnos resueltos.`);
      
      const result = await crearEquipo({
        displayName,
        description,
        teachers: resolvedOwners,
        students: resolvedMembers,
        subjects: subjects || [],
        template: process.env.IS_EDUCATIONAL_TENANT === 'true' ? 'educationClass' : 'standard'
      });

      console.log(`[Teams Audit] Resultado final de teamsService para ${displayName}:`, JSON.stringify(result));

      // Siempre responder con JSON y status explícito (nunca 204)
      if (result.success) {
        return res.status(200).json({ 
          success: true,
          provisioned: result.provisioned || false,
          teamId: result.id,
          message: result.provisioned ? "Equipo creado y listo" : "Equipo creado, pero Teams aún se está provisionando"
        });
      } else {
        return res.status(500).json({
          success: false,
          teamId: result.id || null,
          message: result.message || "Error desconocido en el proceso de Teams",
          details: result
        });
      }
    } catch (error: any) {
        console.error("[Teams Audit] Error fatal en /api/teams/create:", error.message);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
  });

  app.post("/api/teams/create-group", async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    try {
      const { displayName, description, ownerEmails, memberEmails } = req.body;
      const token = await getAppAccessToken();

      // Resolución de identidades duplicada de /create para simplicidad o mover a helper
      const resolveToIds = async (emails: string[]) => {
        const ids: string[] = [];
        for (const email of (emails || [])) {
          if (!email) continue;
          try {
            const cleanEmail = email.trim().replace(/'/g, "''");
            const filter = `userPrincipalName eq '${cleanEmail}' or mail eq '${cleanEmail}' or displayName eq '${cleanEmail}'`;
            const userRes = await fetch(`https://graph.microsoft.com/v1.0/users?$filter=${encodeURIComponent(filter)}&$select=id`, {
              headers: { "Authorization": `Bearer ${token}` }
            });
            if (userRes.ok) {
              const userData = await userRes.json();
              if (userData.value?.length > 0) ids.push(userData.value[0].id);
            }
          } catch (e) {}
        }
        return ids;
      };

      const teachers = await resolveToIds(ownerEmails);
      const students = await resolveToIds(memberEmails);

      const result = await crearGrupoBase({
        displayName,
        description,
        teachers,
        students
      });

      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/teams/activate-team", async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    try {
      const { groupId, template } = req.body;
      if (!groupId) {
        return res.status(400).json({ error: "Missing groupId" });
      }

      console.log(`[Backend] Activando Teams para el grupo: ${groupId}`);
      const token = await getAppAccessToken();
      
      // La URL se construye manualmente para asegurar que esté limpia
      const url = `https://graph.microsoft.com/v1.0/groups/${groupId}/team`;

      const graphResponse = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          "template@odata.bind": `https://graph.microsoft.com/v1.0/teamsTemplates('${template || 'standard'}')`
        })
      });

      if (!graphResponse.ok) {
        // Manejar errores de propagación de Azure (404, 409)
        if (graphResponse.status === 409) {
          console.log(`[Backend] El grupo ${groupId} ya tiene un Team asociado.`);
          return res.status(200).json({ id: groupId, success: true, message: "Team already exists" });
        }
        
        const errorData = await graphResponse.json().catch(() => ({}));
        console.error(`[Backend] Error Graph API (${graphResponse.status}):`, errorData);
        return res.status(graphResponse.status).json({ 
          error: errorData.error?.message || `Error ${graphResponse.status} al activar Teams`
        });
      }

      // 201 Created o 202 Accepted son éxitos
      console.log(`[Backend] Activación solicitada con éxito para ${groupId}`);
      res.status(200).json({ id: groupId, success: true });
    } catch (error: any) {
      console.error("[Backend] Fallo crítico en /api/teams/activate-team:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/teams/notify", async (req, res) => {
    try {
        const { groupName, subjectName, activityName, ms_team_id } = req.body;
        const token = await getAppAccessToken();

        let teamId = ms_team_id;

        // 1. Si no hay ms_team_id, buscar el Team ID por nombre
        if (!teamId) {
            console.log(`[Notify] Buscando equipo por nombre: ${groupName}`);
            const searchRes = await fetch(`https://graph.microsoft.com/v1.0/groups?$filter=displayName eq '${encodeURIComponent(groupName)}'&$select=id,displayName`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            
            if (!searchRes.ok) throw new Error("Failed to fetch groups");
            const groupsData = await searchRes.json();
            teamId = groupsData.value?.[0]?.id;
        }

        if (!teamId) {
            return res.status(404).json({ error: "Team not found in Azure AD" });
        }

        // 2. Buscar canal
        const channelsRes = await fetch(`https://graph.microsoft.com/v1.0/teams/${teamId}/channels`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!channelsRes.ok) throw new Error("Failed to fetch channels");
        const channelsData = await channelsRes.json();
        
        const cleanSubjectName = subjectName.substring(0, 50).replace(/[#%&*{}\\<>?\/|'"~]/g, '');
        const channel = channelsData.value?.find((c: any) => 
          c.displayName.toLowerCase() === cleanSubjectName.toLowerCase() || 
          c.displayName.toLowerCase() === subjectName.toLowerCase()
        );
        const targetChannelId = channel?.id || channelsData.value?.[0]?.id;

        if (!targetChannelId) {
            return res.status(404).json({ error: "Channel not found" });
        }

        const messagePayload = {
            body: {
              contentType: "html",
              content: `
                <div style="padding: 10px; border-left: 4px solid #4f46e5; background-color: #f8fafc;">
                  <h2 style="color: #1e293b; margin-top: 0;">📚 Nueva Asignación / Actividad</h2>
                  <p style="font-size: 16px; font-weight: bold; color: #4f46e5;">${activityName}</p>
                  <p>Esta actividad ha sido configurada en EduCore para la materia de <strong>${subjectName}</strong>.</p>
                  <p style="font-size: 12px; color: #64748b;">Revisa la plataforma para más detalles y los criterios de evaluación de esta asignación.</p>
                </div>
              `
            }
        };

        const postMsgRes = await fetch(`https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${targetChannelId}/messages`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(messagePayload)
        });

        if (!postMsgRes.ok) {
            const errData = await postMsgRes.text();
            throw new Error(errData);
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error("Error in /api/teams/notify:", error.message);
        res.status(500).json({ error: error.message });
    }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware attached.");
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch(err => {
  console.error("FAILED TO START SERVER:", err);
  process.exit(1);
});
