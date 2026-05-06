import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, CheckCircle2, Users, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MicrosoftTeamsService } from '../services/microsoftGraph.service';

interface Props {
  groupId: string;
  displayName: string;
  description: string;
  ownerEmails?: string[];
  memberEmails?: string[];
  onSuccess?: (teamId: string) => void;
}

const TeamsCreationStepper = ({ 
  groupId, 
  displayName, 
  description, 
  ownerEmails = [], 
  memberEmails = [], 
  onSuccess 
}: Props) => {
  // Estados: 'idle', 'creating_azure', 'azure_done', 'creating_teams', 'completed', 'error'
  const [status, setStatus] = useState<'idle' | 'creating_azure' | 'azure_done' | 'creating_teams' | 'completed' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [azureGroupId, setAzureGroupId] = useState<string | null>(null);
  const [graphProvisioningData, setGraphProvisioningData] = useState<any>(null);

  // PASO 1: CREAR EN AZURE Y GUARDAR EN SUPABASE (BLOQUEANTE)
  const handleCreateAzure = async () => {
    setStatus('creating_azure');
    setErrorMsg('');
    
    // Limpieza previa del ID interno para evitar Error 400 en eq()
    const cleanInternalId = String(groupId).trim();
    console.log(`[Stepper] Iniciando Paso 1 para: ${displayName}. ID Interno: ${cleanInternalId}`);
    
    try {
      // A. Crear el grupo en Azure AD (Petición real al backend)
      const azureResponse = await MicrosoftTeamsService.createGroupOnly(
        displayName, 
        description, 
        ownerEmails, 
        memberEmails
      ); 
      
      if (!azureResponse || !azureResponse.id) {
        throw new Error("La API de Azure no regresó un ID de grupo válido.");
      }

      // B. Limpieza del ID para formato UUID puro (Evita error 400 en Postgres UUID)
      const azureUuid = String(azureResponse.id).toLowerCase().trim();
      console.log(`[Stepper] Grupo creado en Azure: ${azureUuid}. Persistiendo en Supabase...`);

      // C. Persistencia bloqueante en Supabase (Solo tabla groups)
      // Usamos .select() para confirmar que el registro existe y se actualizó
      const { data: updateData, error: supabaseError } = await supabase
        .from('groups')
        .update({ 
          azure_group_id: azureUuid, 
          status: 'azure_provisioned',
          provisioned_at: new Date().toISOString() 
        })
        .eq('id', cleanInternalId)
        .select();

      if (supabaseError) {
        console.error('[Stepper] Error Supabase Paso 1:', supabaseError);
        throw new Error(`Error al guardar en base de datos: ${supabaseError.message}`);
      }

      if (!updateData || updateData.length === 0) {
        throw new Error("No se pudo confirmar el guardado en Supabase (Registro no encontrado).");
      }

      console.log('[Stepper] ID guardado exitosamente en Supabase:', updateData);
      
      // GUARDAR DATOS PARA GRAPH EN VARIABLE INTERMEDIA (Requerimiento del usuario)
      setGraphProvisioningData({
        groupId: azureUuid,
        template: 'standard'
      });

      setAzureGroupId(azureUuid);
      setStatus('azure_done');
    } catch (error: any) {
      console.error('[Stepper] Error en Paso 1:', error);
      setErrorMsg(error.message || "Error al crear el grupo en Azure o guardar en BD.");
      setStatus('error');
    }
  };

  // PASO 2: ACTIVAR TEAMS (BLOQUEANTE)
  const handleCreateTeams = async () => {
    if (!graphProvisioningData || !graphProvisioningData.groupId) {
      setErrorMsg("ID de Azure o datos de aprovisionamiento no encontrados.");
      setStatus('error');
      return;
    }

    setStatus('creating_teams');
    setErrorMsg('');
    const cleanAzureId = String(graphProvisioningData.groupId).trim();
    const cleanInternalId = String(groupId).trim();

    try {
      // A. Activar el Team en Microsoft Graph (Usando los datos guardados en la variable)
      const teamsResponse = await MicrosoftTeamsService.activateTeamOnly(
        cleanAzureId, 
        graphProvisioningData.template
      );
      
      if (!teamsResponse || !teamsResponse.id) {
        throw new Error("La activación de Teams no devolvió un ID de confirmación válido.");
      }

      const teamId = String(teamsResponse.id).trim();
      console.log(`[Stepper] Teams activado: ${teamId}. Finalizando persistencia...`);

      // B. Actualizar estado final en Supabase
      const { data: finalData, error: finalError } = await supabase
        .from('groups')
        .update({ 
          teams_id: teamId, 
          is_teams_active: true,
          ms_team_id: teamId,
          team_created: true,
          status: 'completed'
        })
        .eq('id', cleanInternalId)
        .select();

      if (finalError) {
        console.error('[Stepper] Error Supabase Paso 2:', finalError);
        throw new Error(`Error al finalizar en base de datos: ${finalError.message}`);
      }

      console.log('[Stepper] Proceso finalizado y guardado en Supabase:', finalData);

      setStatus('completed');
      if (onSuccess) onSuccess(teamId);
    } catch (error: any) {
      console.error('[Stepper] Error en Paso 2:', error);
      setErrorMsg(error.message || "Error al activar Teams. Inténtalo de nuevo.");
      setStatus('error');
    }
  };

  const LoadingText = ({ text = "Cargando" }: { text?: string }) => (
    <span className="flex items-center gap-1">
      {text}
      <span className="inline-flex gap-0.5 ml-1">
        <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
        <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></span>
        <span className="w-1 h-1 bg-current rounded-full animate-bounce"></span>
      </span>
    </span>
  );

  return (
    <div id={`teams-stepper-${groupId}`} className="p-6 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 max-w-md mx-auto">
      <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">Proceso de Creación</h3>
      
      <AnimatePresence mode="wait">
        {/* BOTÓN 1: AZURE / BASE DE DATOS */}
        {(status === 'idle' || status === 'creating_azure') && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-semibold">Paso 1: Identidad en Azure</p>
            <button
              id="btn-create-db-step"
              onClick={handleCreateAzure}
              disabled={status === 'creating_azure'}
              className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all
                ${status === 'creating_azure' 
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'}`}
            >
              {status === 'creating_azure' ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  <LoadingText text="Creando en Azure" />
                </>
              ) : (
                <>
                  <Users size={20} />
                  1. Crear Grupo Base
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* BOTÓN 2: CONFIRMACIÓN / TEAMS */}
        {(status === 'azure_done' || status === 'creating_teams') && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex flex-col gap-3"
          >
            <p className="text-xs text-emerald-600 mb-1 uppercase tracking-wider font-semibold flex items-center gap-1">
              <CheckCircle2 size={12} /> Fase 1 completada
            </p>
            <p className="text-sm text-slate-500 mb-2">El grupo se ha guardado en Supabase. Ahora activa la interfaz de Teams.</p>
            <button
              id="btn-confirm-teams-step"
              onClick={handleCreateTeams}
              disabled={status === 'creating_teams'}
              className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all
                ${status === 'creating_teams' 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'}`}
            >
              {status === 'creating_teams' ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  <LoadingText text="Activando Teams" />
                </>
              ) : (
                <>
                  <MessageSquare size={20} />
                  2. Confirmar y Activar Teams
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* ESTADO FINAL: ÉXITO */}
        {status === 'completed' && (
          <motion.div
            key="success-step"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800"
          >
            <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={32} />
            <p className="text-emerald-800 dark:text-emerald-400 font-semibold">¡Equipo de Teams creado con éxito!</p>
          </motion.div>
        )}

        {/* MANEJO DE ERRORES */}
        {status === 'error' && (
          <motion.div 
            key="error-step"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl text-sm border border-red-200 dark:border-red-800 shadow-sm"
          >
            <div className="flex flex-col gap-3">
              <p className="font-medium">{errorMsg}</p>
              <button 
                id="btn-retry-step"
                onClick={() => {
                  if (azureGroupId) setStatus('azure_done');
                  else setStatus('idle');
                }}
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors"
              >
                Reintentar fase
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeamsCreationStepper;

