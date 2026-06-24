## Checklist de actualizaciones

### GESTIÓN

**1. Gantt — múltiples diagramas**
- [ ] Añadir colección `ganttCharts` al store (id, nombre, lista de tareas)
- [ ] Selector desplegable arriba para cambiar entre diagramas + botón "Nuevo diagrama" + renombrar/eliminar
- [ ] Migrar tareas existentes a un diagrama "Principal"
- [ ] Mejorar creación de tareas: campos "Tarea padre" (opcional, seleccionar existente o ninguna) y "Depende de" (opcional, multi-select de tareas del mismo diagrama)
- [ ] Editar tareas tanto desde el cronograma (clic en barra) como desde la tabla de detalle (botón editar por fila)
- [ ] Validar dependencias circulares al guardar

**2. Riesgos — edición**
- [ ] Botón editar por fila que abre el mismo diálogo de creación precargado
- [ ] Permitir modificar probabilidad, impacto, mitigación, estado y recalcular nivel automáticamente

**3. Presupuesto — rubros y subrubros**
- [ ] Etiquetar campos planeado/real con prefijo "$" y validación numérica
- [ ] Añadir sub-rubros por rubro (concepto + monto), el real del rubro = suma de subrubros
- [ ] Cada rubro es expandible/colapsable (chevron) mostrando los subrubros
- [ ] Editar rubro (nombre, planeado) y editar/eliminar subrubros
- [ ] Alertas de sobrecosto se mantienen comparando planeado vs suma de subrubros

**4. OKR — eliminar**
- [ ] Borrar `src/routes/okr.tsx`, ítem del sidebar, claves del store y referencias en hábitos

### COLABORACIÓN

**5. Equipo — invitación por correo real (requiere Lovable Cloud)**
- [ ] Activar Lovable Cloud
- [ ] Tabla `profiles` + tabla `team_members` (role, permissions[]) + `user_roles` con enum admin/editor/viewer
- [ ] Función `has_role` (security definer) y políticas RLS basadas en rol
- [ ] Server function que invita por email vía Supabase Auth `inviteUserByEmail` (correo con link mágico)
- [ ] Gate de rutas: admin edita todo, editor edita módulos habilitados, viewer solo lectura
- [ ] UI de permisos refleja restricciones por rol

**6. Reuniones — completar y archivar**
- [ ] Checkbox por acuerdo (completado individual)
- [ ] Botón "Marcar reunión completa" (sólo si todos los acuerdos están en check)
- [ ] Pestañas "Activas" / "Archivadas" en la vista
- [ ] Las archivadas siguen siendo editables y se pueden reactivar

### PLANIFICACIÓN

**7. Plantillas**
- [ ] Botón mostrar/ocultar tareas por plantilla (colapsar lista)
- [ ] Editar plantilla después de creada (nombre, tareas, días)
- [ ] Etiqueta clara "Duración (días)" junto al campo de tareas

### AUTOMATIZACIÓN

**8. Auto-estados — CRUD de reglas**
- [ ] Permitir crear reglas personalizadas (no solo los 3 toggles fijos)
- [ ] Editar y eliminar reglas existentes
- [ ] Mantener log de cambios

**9. Reglas — editar y eliminar**
- [ ] Botón editar (abre diálogo precargado) además del eliminar existente

---

### Notas técnicas
- Cloud sólo se activa para el módulo Equipo (auth e invitaciones reales). El resto sigue en `localStorage`.
- Cambios son grandes; los implementaré en este orden: OKR eliminado → Gantt → Riesgos → Presupuesto → Plantillas → Auto-estados/Reglas → Reuniones → Equipo (Cloud al final por ser el más invasivo).
- Confirma para proceder, o dime si quieres reordenar/recortar.