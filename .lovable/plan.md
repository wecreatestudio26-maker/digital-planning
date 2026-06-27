
## Objetivo

Hoy solo unas pocas vistas usan `useTranslation`. Al cambiar idioma, la mayor parte de la app sigue en español. Vamos a internacionalizar todos los textos visibles para que el cambio entre **es · en · fr · it** sea completo.

## Alcance

Páginas y componentes con texto en duro a traducir:

- Rutas autenticadas (16): `dashboard`, `actividades`, `gantt`, `riesgos`, `presupuesto`, `habitos`, `tiempo`, `evaluacion`, `enfoque`, `equipo`, `carga`, `reuniones`, `plantillas`, `recordatorios`, `auto-estados`, `reglas`.
- Flujo de auth: `login`, `register`, `forgot-password`, `reset-password`, `check-email`, `invite.$token`.
- Componentes compartidos: `StatusBadge`, `AppSidebar` (textos restantes), `AuthCard`, mensajes de toast/validación frecuentes.

Fuera de alcance: contenido generado por el usuario (nombres de actividades, categorías, miembros), datos de BD, y SEO/meta tags por ruta (se mantienen como están).

## Enfoque

1. **Ampliar los diccionarios** `src/i18n/locales/{es,en,fr,it}.json` con namespaces por página: `dashboard.*`, `activities.*`, `gantt.*`, `risks.*`, `budget.*`, `habits.*`, `time.*`, `evaluation.*`, `focus.*`, `team.*`, `workload.*`, `meetings.*`, `templates.*`, `reminders.*`, `autostates.*`, `rules.*`, `auth.*`, `status.*`, `toast.*`.
2. **Reemplazar literales** en cada archivo por `t("namespace.clave")` usando `const { t } = useTranslation()`. Mantener exactamente la misma UI, solo cambiar la fuente del texto.
3. **Pluralización y variables** con interpolación de i18next (`{{count}}`, `{{name}}`) donde aplique (p. ej. "5 actividades", "Hola, {{name}}").
4. **Verificación**: revisar dashboard tras los cambios cambiando idioma desde el `LanguageSwitcher` y confirmar que no queden cadenas en español al elegir en / fr / it.

## Detalles técnicos

- Las 4 claves de cada string se añaden a la vez en los 4 JSON para mantenerlos sincronizados.
- Las traducciones a en / fr / it se generan a partir del texto en español existente; el usuario podrá ajustarlas luego si quiere afinar tono.
- No se toca la lógica de negocio, ni server functions, ni la BD. Solo capa de presentación.
- No se reorganiza la estructura de carpetas ni el routing.

## Entrega

Dado el volumen (≈16 páginas + flujos de auth), lo haré en una sola tanda de cambios coordinados sobre los JSON y los componentes, sin pasos intermedios visibles para ti. Al terminar, la app quedará totalmente traducida en los 4 idiomas soportados.
