-- Opción 1: Actualizar por CÓDIGO (Recomendado)
-- Reemplaza 'CODIGO_MATERIA' por el código real de la materia (ej. 'ING-101')
UPDATE subjects
SET is_common_core = TRUE, career = 'Todas'
WHERE code = 'CODIGO_MATERIA';

-- Opción 2: Actualizar por NOMBRE
-- Reemplaza 'Nombre de la Materia' por el nombre exacto
UPDATE subjects
SET is_common_core = TRUE, career = 'Todas'
WHERE name = 'Nombre de la Materia';

-- Opción 3: Ver todas las materias para encontrar el código
SELECT * FROM subjects;
