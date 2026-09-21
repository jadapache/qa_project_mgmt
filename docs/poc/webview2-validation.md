# Documento de Validación PoC: WebView2 Runtime (Windows)

## Objetivo
Verificar la disponibilidad y compatibilidad del runtime **Microsoft Edge WebView2** en entornos corporativos Windows 10 (v1903+) y Windows 11 para la ejecución de la aplicación de escritorio **QA Project Mgmt** construida sobre Tauri 2.x.

## Criterios de Evaluación
1. **Disponibilidad predeterminada:**
   - Windows 11: Incluido nativamente en el sistema operativo.
   - Windows 10: Incluido automáticamente mediante actualizaciones de Microsoft Edge Evergreen Bootstrapper en la mayoría de equipos corporativos.
2. **Instalación sin privilegios de administrador:**
   - En caso de no estar presente, el instalador Evergreen Standalone o Evergreen Bootstrapper puede instalarse a nivel de usuario (`per-user install`).
3. **Compatibilidad con Tauri 2.x:**
   - Tauri 2.x detecta automáticamente el runtime WebView2 instalado en el sistema.
   - Si no está presente, la aplicación muestra una ventana de diálogo nativa o mensaje indicando la necesidad del runtime WebView2 antes de inicializar la interfaz.

## Resultado de Validación PoC
- **Estado:** ✅ APROBADO
- **Observaciones:** El ejecutable Tauri 2.x no requiere instalación de Python ni .NET runtime en las estaciones de trabajo de los usuarios finales (Req. 12.1, 12.2, 12.3, 16.2).
