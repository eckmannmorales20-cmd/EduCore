-- Script para sincronizar los correos electrónicos de la tabla profiles
-- hacia la tabla teachers y students, asegurando que ambos lados coincidan.
-- Ideal para cuando se importaron o editaron correos (ej. para M365) directamente
-- en la tabla profiles.

-- 1. Sincronizar correos de profiles hacia teachers
UPDATE teachers t
SET email = p.email
FROM profiles p
WHERE t.name = p.name -- Usa el nombre para relacionar (ya que el id o el email previo podrían diferir)
  AND t.email != p.email;

-- 2. Sincronizar correos de profiles hacia students
UPDATE students s
SET email = p.email
FROM profiles p
WHERE s.name = p.name 
  AND s.email != p.email;

-- Nota: Si usas algún otro campo único como "employee_id" o "enrollment"
-- que esté ligado al "username" de profiles, podrías ajustar el "WHERE" en consecuencia.
