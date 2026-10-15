-- ============================================================================
-- 0003_registrar_pago_deuda.sql
-- Función RPC para registrar un pago de deuda de forma ATÓMICA: inserta la
-- fila en `deuda_pagos` y descuenta el importe de `deudas.importe_pendiente`
-- en una sola transacción, evitando que ambas escrituras queden
-- inconsistentes si una de las dos falla a mitad de camino.
--
-- SECURITY INVOKER (por defecto): la función se ejecuta con los permisos del
-- usuario que la llama, así que las políticas RLS de `deudas` y
-- `deuda_pagos` se siguen aplicando con normalidad. No hace falta
-- comprobar `user_id` a mano dentro de la función: si el usuario no es
-- dueño de la deuda, el UPDATE/INSERT ya fallará por RLS.
-- ============================================================================

create or replace function public.registrar_pago_deuda(
  p_deuda_id uuid,
  p_importe numeric,
  p_fecha date default current_date
)
returns public.deudas
language plpgsql
as $$
declare
  v_deuda public.deudas;
begin
  if p_importe <= 0 then
    raise exception 'El importe del pago debe ser mayor que cero.';
  end if;

  -- Bloquea la fila de la deuda hasta el final de la transacción, para
  -- evitar condiciones de carrera si se registran dos pagos casi a la vez.
  select * into v_deuda
  from public.deudas
  where id = p_deuda_id
  for update;

  if not found then
    raise exception 'Deuda no encontrada o sin permiso para modificarla.';
  end if;

  if p_importe > v_deuda.importe_pendiente then
    raise exception 'El importe del pago (%) supera el saldo pendiente (%).', p_importe, v_deuda.importe_pendiente;
  end if;

  insert into public.deuda_pagos (deuda_id, fecha, importe)
  values (p_deuda_id, p_fecha, p_importe);

  update public.deudas
  set importe_pendiente = importe_pendiente - p_importe
  where id = p_deuda_id
  returning * into v_deuda;

  return v_deuda;
end;
$$;

-- Permite invocar la función a cualquier usuario autenticado; RLS en las
-- tablas subyacentes sigue siendo quien decide si puede tocar esa fila.
grant execute on function public.registrar_pago_deuda(uuid, numeric, date) to authenticated;
