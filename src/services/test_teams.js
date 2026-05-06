import dotenv from 'dotenv';
import { obtenerToken, crearEquipo } from './teamsService.js';

dotenv.config();

async function run() {
  try {
    console.log('--- Test: obtener token ---');
    const token = await obtenerToken();
    console.log('Access token:', token);

    console.log('\n--- Test: crear equipo vía crearEquipo() ---');
    const payload = {
      displayName: 'Equipo Prueba',
      description: 'Equipo creado desde el sistema',
      teachers: [],
      students: [],
      template: 'educationClass'
    };

    const res = await crearEquipo(payload);
    console.log('\nGraph response:');
    console.log(JSON.stringify(res, null, 2));

    // Try to extract team id if possible
    if (res && res.id) {
      console.log('\nTeam created with id:', res.id);
    } else if (res && res.operation && res.operation.data) {
      console.log('\nOperation result:', JSON.stringify(res.operation, null, 2));
    }
  } catch (err) {
    console.error('ERROR during test_create_team:', err.response?.data || err.message || err);
    process.exitCode = 1;
  }
}

run();
