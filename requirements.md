# Requirements Document

## Introduction

**QA Project Mgmt** es una aplicación de escritorio corporativa para la gestión integral de proyectos de software, calidad (QA/QaS), pruebas de aceptación de usuario (UAT), generación documental asistida por IA y trazabilidad de auditoría. Se distribuye como ejecutable nativo para Windows mediante Tauri 2.x, con un frontend React/TypeScript/Vite, un backend Python/FastAPI y una base de datos PostgreSQL. La capa de IA utiliza LlamaIndex o LangChain con índice vectorial almacenado en PostgreSQL para capacidades RAG (Retrieval-Augmented Generation). La autenticación se realiza con JWT usuario/contraseña sin SSO. Toda comunicación entre el cliente y el backend se realiza exclusivamente por HTTPS/JSON.

---

## Glossary

| Término | Definición |
|---|---|
| **Sistema** | La aplicación QA Project Mgmt en su conjunto (cliente Tauri + backend FastAPI). |
| **Cliente** | La aplicación de escritorio Tauri 2.x que se ejecuta en el equipo Windows del usuario. |
| **Backend** | El servicio FastAPI desplegado en infraestructura corporativa remota. |
| **BD** | La base de datos PostgreSQL gestionada con SQLAlchemy 2.x y Alembic. |
| **Motor_RAG** | El subsistema de IA compuesto por LlamaIndex o LangChain con índice vectorial en PostgreSQL. |
| **JWT** | JSON Web Token usado como credencial de sesión autenticada. |
| **Usuario** | Persona autenticada con rol asignado (Administrador, Líder_QA, Analista_QA, UAT_Tester, Observador). |
| **Administrador** | Rol con permisos plenos sobre usuarios, proyectos y configuración del sistema. |
| **Líder_QA** | Rol con permisos de creación y gestión de proyectos, iteraciones, historias, casos de prueba y sesiones UAT. |
| **Analista_QA** | Rol con permisos de ejecución de casos de prueba, registro de evidencias y defectos. |
| **UAT_Tester** | Rol con permisos de participación en sesiones UAT y registro de resultados. |
| **Observador** | Rol de solo lectura sobre proyectos asignados. |
| **Proyecto** | Unidad de trabajo que agrupa iteraciones, historias de usuario, casos de prueba y documentos. |
| **Iteración** | Sprint o ciclo de trabajo delimitado por fechas dentro de un Proyecto. |
| **Historia_Usuario** | Requisito funcional expresado como historia de usuario, asociado a una Iteración. |
| **Caso_Prueba** | Procedimiento verificable asociado a una Historia_Usuario con pasos, datos de entrada y resultado esperado. |
| **Ejecución** | Instancia de la ejecución de un Caso_Prueba con resultado real, evidencias y defectos asociados. |
| **Evidencia** | Archivo adjunto (captura, log, vídeo) vinculado a una Ejecución. |
| **Defecto** | Incidencia registrada a partir de una Ejecución fallida, con severidad, estado y responsable. |
| **Certificación** | Documento formal que consolida el resultado de un ciclo QaS completo. |
| **Sesión_UAT** | Conjunto de pruebas de aceptación realizadas por usuarios finales en un período definido. |
| **Plantilla_Documental** | Estructura base de un documento generado por el Sistema (acta, informe, certificado). |
| **Documento_Versionado** | Instancia de una Plantilla_Documental con contenido generado, número de versión y estado de aprobación. |
| **Fuente_RAG** | Fragmento de texto recuperado del índice vectorial con su referencia de origen (nombre de archivo, página). |
| **Sesión_Chat** | Hilo de conversación entre un Usuario y el Motor_RAG, vinculado a un Proyecto. |
| **Ingesta** | Proceso de indexación de documentos corporativos en el índice vectorial del Motor_RAG. |
| **Registro_Auditoría** | Entrada inmutable que documenta quién realizó qué acción, sobre qué entidad y cuándo. |
| **Exportación** | Generación de archivo XLSX con datos del Sistema para uso externo. |
| **Importación** | Carga de datos desde un archivo XLSX hacia el Sistema. |
| **CAT** | Criterio de Aceptación Tecnológico que valida restricciones de plataforma y arquitectura. |

---

## Requirements

---

### Requisito 1: Autenticación de Usuarios

**Historia de usuario:** Como Usuario, quiero autenticarme con mi nombre de usuario y contraseña corporativa, para acceder de forma segura a las funciones del Sistema según mi rol asignado.

#### Criterios de aceptación

1. WHEN un Usuario envía credenciales válidas (usuario y contraseña), THE Backend SHALL emitir un JWT firmado con tiempo de expiración de 8 horas y devolverlo al Cliente en el cuerpo de la respuesta HTTP 200.
2. IF un Usuario envía credenciales inválidas, THEN THE Backend SHALL responder con HTTP 401 y un mensaje genérico de autenticación fallida, sin revelar si el error corresponde al usuario o a la contraseña.
3. IF un Usuario realiza 5 intentos de autenticación fallidos consecutivos desde el mismo nombre de usuario en un período de 10 minutos, THEN THE Backend SHALL bloquear el nombre de usuario durante 15 minutos y responder con HTTP 429.
4. WHEN el JWT de un Usuario expira, THE Cliente SHALL redirigir al Usuario a la pantalla de inicio de sesión y descartar el JWT almacenado en memoria.
5. IF una solicitud entrante tiene como destino un endpoint protegido, THEN THE Backend SHALL validar el JWT de dicha solicitud antes de procesar la lógica de negocio.
6. IF una solicitud entrante porta un JWT inválido, expirado o ausente, THEN THE Backend SHALL rechazar la solicitud con HTTP 401 sin procesar la lógica de negocio.
7. WHEN un Usuario cierra sesión de forma explícita, THE Cliente SHALL eliminar el JWT de la memoria de la sesión activa e invalidarlo en el Backend mediante una lista de tokens revocados.
8. THE Sistema SHALL transmitir las credenciales de autenticación exclusivamente sobre HTTPS; queda prohibida la transmisión de credenciales sobre HTTP plano.
9. THE Backend SHALL almacenar las contraseñas de Usuario exclusivamente como hash bcrypt con factor de coste mínimo 12; queda prohibido el almacenamiento en texto plano o con hash reversible.
10. IF la contraseña de un Usuario tiene menos de 10 caracteres o no contiene al menos una mayúscula, una minúscula y un dígito, THEN THE Backend SHALL rechazar el registro o el cambio de contraseña con HTTP 422 y un mensaje que describa el criterio incumplido.
11. WHEN el Backend emite un JWT, THE Backend SHALL incluir en el payload del JWT el rol asignado al Usuario autenticado.
12. IF un Usuario autenticado solicita un recurso para el cual su rol no tiene permiso, THEN THE Backend SHALL rechazar la solicitud con HTTP 403 sin procesar la lógica de negocio del recurso solicitado.

---

### Requisito 2: Gestión de Roles y Autorización

**Historia de usuario:** Como Administrador, quiero asignar roles a los usuarios y que el Sistema haga cumplir los permisos en el servidor, para garantizar que cada persona acceda únicamente a las funciones que le corresponden.

#### Criterios de aceptación

1. THE Backend SHALL evaluar los permisos de cada operación en el servidor a partir del rol codificado en el JWT; el Cliente no determina permisos de acceso.
2. THE Sistema SHALL soportar exactamente los roles: Administrador, Líder_QA, Analista_QA, UAT_Tester y Observador, con la matriz de permisos definida en la sección de diseño.
3. WHEN un Administrador crea un Usuario, THE Backend SHALL asignar al Usuario exactamente un rol y persistirlo en la BD.
4. WHEN un Administrador modifica el rol de un Usuario, THE Backend SHALL invalidar todos los JWT activos de ese Usuario en la lista de tokens revocados e impedir el uso de cualquier JWT emitido antes de la modificación.
5. IF un Usuario intenta ejecutar una operación para la que su rol no tiene permiso, THEN THE Backend SHALL responder con HTTP 403; la respuesta no incluirá información sobre la lógica interna de permisos, nombres de roles internos ni rutas de recursos protegidos.
6. THE Backend SHALL registrar en el Registro_Auditoría cada asignación o modificación de rol con el identificador del Administrador ejecutor, el identificador del Usuario afectado, el rol anterior, el rol nuevo y la marca de tiempo UTC en formato ISO 8601.
7. WHERE el rol sea Observador, THE Backend SHALL restringir todas las operaciones de escritura (POST, PUT, PATCH, DELETE) sobre cualquier recurso del Sistema.
8. IF una solicitud llega sin JWT o con JWT cuyo formato no es el esperado (malformado), THEN THE Backend SHALL rechazar la solicitud con HTTP 401 sin procesar ninguna lógica de negocio.

---

### Requisito 3: Gestión de Proyectos

**Historia de usuario:** Como Líder_QA, quiero crear y administrar proyectos con sus iteraciones e historias de usuario, para organizar el trabajo de calidad de forma estructurada y trazable.

#### Criterios de aceptación

1. WHEN un Líder_QA crea un Proyecto, THE Backend SHALL persistir el Proyecto en la BD con nombre único de 3 a 100 caracteres, descripción de hasta 500 caracteres, fecha de inicio, fecha de fin estimada, estado inicial Activo e identificador del Líder_QA creador.
2. IF la fecha de fin estimada de un Proyecto es anterior a su fecha de inicio, THEN THE Backend SHALL rechazar la creación con HTTP 422 y un mensaje que describa el error de fecha.
3. IF el nombre de un Proyecto ya existe en la BD, THEN THE Backend SHALL rechazar la creación con HTTP 409 y un mensaje que indique el conflicto de nombre.
4. WHEN un Líder_QA crea una Iteración dentro de un Proyecto con estado Activo, THE Backend SHALL persistir la Iteración con nombre de 1 a 100 caracteres, fecha de inicio, fecha de fin y estado inicial Planificada, vinculada al Proyecto.
5. IF la fecha de fin de una Iteración es anterior a su fecha de inicio, THEN THE Backend SHALL rechazar la creación con HTTP 422 y un mensaje descriptivo del error de fecha.
6. IF un Líder_QA intenta crear una Iteración en un Proyecto con estado Suspendido o Cerrado, THEN THE Backend SHALL rechazar la operación con HTTP 409 e indicar el estado del Proyecto.
7. WHEN un Líder_QA o Analista_QA crea una Historia_Usuario dentro de una Iteración con estado Planificada o En_Curso, THE Backend SHALL persistir la Historia_Usuario con identificador único, descripción de 1 a 1000 caracteres, criterios de aceptación de hasta 2000 caracteres, prioridad (Alta / Media / Baja; valor por defecto Media) y estado inicial Pendiente.
8. IF un Líder_QA o Analista_QA intenta crear una Historia_Usuario en una Iteración con estado Finalizada, THEN THE Backend SHALL rechazar la operación con HTTP 409 e indicar el estado de la Iteración.
9. WHEN un Usuario con rol Observador consulta un Proyecto, THE Backend SHALL devolver la información del Proyecto y sus Iteraciones e Historias_Usuario sin exponer campos de configuración interna ni identificadores de Proyectos no asignados al Usuario.
10. THE Backend SHALL devolver la lista de Proyectos de un Usuario únicamente para los Proyectos en los que el Usuario tenga rol asignado.
11. WHEN el estado de un Proyecto cambia, THE Backend SHALL registrar el cambio en el Registro_Auditoría con el identificador del Usuario, el estado anterior, el estado nuevo y la marca de tiempo UTC en formato ISO 8601.

---

### Requisito 4: Ejecución de Casos de Prueba QA/QaS

**Historia de usuario:** Como Analista_QA, quiero registrar la ejecución de casos de prueba con sus evidencias y defectos asociados, para documentar el proceso de calidad de forma trazable y generar certificaciones de ciclos QaS.

#### Criterios de aceptación

1. WHEN un Líder_QA crea un Caso_Prueba, THE Backend SHALL persistirlo en la BD con identificador único, título de hasta 255 caracteres, precondiciones de hasta 2000 caracteres, máximo 100 pasos de ejecución numerados, datos de entrada, resultado esperado, Historia_Usuario asociada y estado inicial Borrador.
2. IF la Historia_Usuario referenciada al crear un Caso_Prueba no existe en la BD, THEN THE Backend SHALL rechazar la creación con HTTP 422 indicando el identificador inválido.
3. WHEN un Analista_QA registra una Ejecución de un Caso_Prueba con estado Aprobado, THE Backend SHALL persistir la Ejecución con resultado (Aprobado / Fallido / Bloqueado / No_Ejecutado), comentarios de hasta 2000 caracteres, fecha y hora de ejecución en UTC e identificador del Analista_QA.
4. IF un Analista_QA intenta registrar una Ejecución de un Caso_Prueba con estado Borrador u Obsoleto, THEN THE Backend SHALL rechazar la operación con HTTP 422 indicando el estado del Caso_Prueba.
5. WHEN un Analista_QA adjunta una Evidencia a una Ejecución existente, THE Backend SHALL almacenar el archivo en el repositorio de archivos configurado, registrar en la BD la ruta, el tipo MIME, el tamaño en bytes y la marca de tiempo UTC, y devolver el identificador de la Evidencia.
6. IF la Ejecución referenciada al adjuntar una Evidencia no existe en la BD, THEN THE Backend SHALL rechazar la operación con HTTP 404.
7. THE Backend SHALL aceptar archivos de Evidencia con tipo MIME: image/png, image/jpeg, image/gif, application/pdf, text/plain, text/csv, con tamaño máximo de 20 MB por archivo.
8. IF el tipo MIME o el tamaño del archivo de Evidencia supera los límites definidos, THEN THE Backend SHALL rechazar la carga con HTTP 422 y un mensaje que describa el límite excedido.
9. IF una Ejecución tiene resultado Fallido, THEN THE Backend SHALL permitir al Analista_QA registrar uno o más Defectos; cada Defecto debe contener título de hasta 255 caracteres, descripción de hasta 2000 caracteres, pasos para reproducir de hasta 2000 caracteres, severidad (Crítica / Alta / Media / Baja) y estado inicial Abierto.
10. IF un Analista_QA intenta registrar un Defecto sobre una Ejecución con resultado distinto a Fallido, THEN THE Backend SHALL rechazar la operación con HTTP 422 indicando el resultado de la Ejecución.
11. WHEN un Líder_QA genera una Certificación de un ciclo QaS existente, THE Backend SHALL calcular el porcentaje de cobertura como (número de Casos_Prueba con al menos una Ejecución / número total de Casos_Prueba del ciclo) × 100 con dos decimales, y el porcentaje de aprobación como (número de Ejecuciones con resultado Aprobado / número total de Ejecuciones del ciclo) × 100 con dos decimales, y persistir el Documento_Versionado con versión autoincremental.
12. IF el ciclo QaS indicado para generar la Certificación no existe en la BD, THEN THE Backend SHALL rechazar la operación con HTTP 404.
13. THE Backend SHALL registrar en el Registro_Auditoría cada creación de Ejecución, adjunto de Evidencia y cambio de estado de Defecto, incluyendo identificador del actor, tipo de evento, identificador de la entidad afectada, estado anterior y marca de tiempo UTC.

---

### Requisito 5: Gestión de Sesiones UAT

**Historia de usuario:** Como Líder_QA, quiero gestionar sesiones de pruebas de aceptación de usuario y que los UAT_Testers registren sus resultados, para obtener validación formal de los usuarios finales sobre las funcionalidades entregadas.

#### Criterios de aceptación

1. WHEN un Líder_QA crea una Sesión_UAT, THE Backend SHALL persistirla en la BD con nombre de hasta 200 caracteres, descripción de hasta 2000 caracteres, Proyecto asociado, fecha de inicio, fecha de fin (posterior a la fecha de inicio), lista de entre 1 y 100 UAT_Testers invitados, y al menos un Caso_Prueba o Historia_Usuario cubierta, con estado inicial Abierta.
2. IF la fecha de fin de la Sesión_UAT es anterior o igual a la fecha de inicio, o si la lista de UAT_Testers está vacía, o si no se asocia al menos un Caso_Prueba o Historia_Usuario, THEN THE Backend SHALL rechazar la creación con HTTP 422 indicando el campo inválido y sin persistir ningún registro parcial.
3. WHEN un UAT_Tester invitado registra el resultado de una Sesión_UAT con estado Abierta, THE Backend SHALL persistir el resultado (Aprobado / Rechazado / Observaciones), comentarios de hasta 4000 caracteres, marca de tiempo UTC del servidor e identificador del UAT_Tester, vinculado a la Sesión_UAT.
4. IF un UAT_Tester intenta registrar resultados en una Sesión_UAT a la que no fue invitado, THEN THE Backend SHALL rechazar la operación con HTTP 403.
5. IF un UAT_Tester intenta registrar resultados en una Sesión_UAT con estado Cerrada, THEN THE Backend SHALL rechazar la operación con HTTP 409 indicando que la sesión está cerrada.
6. WHEN la Sesión_UAT alcanza su fecha de fin, THE Backend SHALL cambiar el estado de la Sesión_UAT a Cerrada y registrar en el Registro_Auditoría el identificador de la sesión, la marca de tiempo UTC de cierre y el identificador del Líder_QA propietario.
7. WHEN un Líder_QA consulta el resumen de una Sesión_UAT, THE Backend SHALL devolver: (a) porcentaje de participación = (número de UAT_Testers que registraron resultado / número de UAT_Testers invitados) × 100 redondeado a 2 decimales; (b) porcentaje de aprobados = (número de resultados Aprobado / número total de resultados registrados) × 100 redondeado a 2 decimales; (c) lista de observaciones con el texto del comentario, el identificador del UAT_Tester y la marca de tiempo UTC de cada resultado Observaciones registrado.

---

### Requisito 6: Generación Documental con Plantillas

**Historia de usuario:** Como Líder_QA, quiero generar documentos formales (actas, informes, certificados) a partir de plantillas corporativas versionadas, para entregar documentación estandarizada a los interesados del proyecto.

#### Criterios de aceptación

1. THE Backend SHALL almacenar las Plantillas_Documentales con nombre, descripción, versión, estado (Activa / Obsoleta) y el contenido de la plantilla como texto estructurado o binario.
2. WHEN un Líder_QA genera un Documento_Versionado a partir de una Plantilla_Documental, THE Backend SHALL combinar la plantilla con los datos del Proyecto, Iteración, Ejecuciones y métricas, y persistir el Documento_Versionado con número de versión autoincremental, fecha de generación, estado (Borrador / En_Revisión / Aprobado) e identificador del generador.
3. WHEN un Líder_QA aprueba un Documento_Versionado, THE Backend SHALL cambiar el estado a Aprobado, registrar la marca de tiempo de aprobación y el identificador del aprobador, y bloquear modificaciones posteriores del contenido.
4. IF se solicita generar un Documento_Versionado con una Plantilla_Documental en estado Obsoleta, THEN THE Backend SHALL rechazar la operación con HTTP 422 y un mensaje que indique la versión activa disponible.
5. THE Backend SHALL mantener el historial completo de versiones de cada Documento_Versionado, permitiendo recuperar cualquier versión anterior.
6. THE Backend SHALL registrar en el Registro_Auditoría cada generación, modificación y aprobación de Documento_Versionado.

---

### Requisito 7: Asistente de IA con RAG — Sesiones de Chat

**Historia de usuario:** Como Líder_QA o Analista_QA, quiero sostener sesiones de chat con el asistente de IA dentro del contexto de un Proyecto, para obtener respuestas basadas en la documentación corporativa indexada y en el contenido del Proyecto.

#### Criterios de aceptación

1. WHEN un Usuario inicia una Sesión_Chat, THE Backend SHALL crear la Sesión_Chat en la BD vinculada al Proyecto seleccionado, con identificador único, marca de tiempo de inicio e identificador del Usuario, y devolver el identificador de la sesión al Cliente en un plazo máximo de 3 segundos.
2. WHEN un Usuario envía un mensaje en una Sesión_Chat activa, THE Motor_RAG SHALL recuperar los fragmentos de documentación más relevantes del índice vectorial del Proyecto y devolver una respuesta que integre el contexto recuperado en un plazo máximo de 15 segundos.
3. THE Backend SHALL incluir en cada respuesta del Motor_RAG la lista de Fuentes_RAG utilizadas, con nombre del documento de origen y número de página o fragmento identificador, referenciando al menos un fragmento por cada afirmación sustentada en documentación indexada.
4. THE Cliente SHALL mostrar las Fuentes_RAG de cada respuesta de forma visible al Usuario sin necesidad de solicitud adicional, listando cada fuente con su nombre de documento y referencia de fragmento en la misma vista del mensaje de respuesta.
5. WHILE una Sesión_Chat está activa, THE Backend SHALL mantener el historial de mensajes de la sesión, incluyendo los últimos 50 intercambios como máximo, y utilizarlo como contexto para las siguientes consultas del mismo hilo.
6. THE Backend SHALL persistir el historial completo de cada Sesión_Chat en la BD, incluyendo cada mensaje del Usuario con su marca de tiempo, cada respuesta del Motor_RAG con su marca de tiempo y las Fuentes_RAG asociadas a cada respuesta.
7. IF el Motor_RAG no recupera fragmentos relevantes con una similitud superior al umbral configurado, THEN THE Backend SHALL devolver una respuesta que indique que no se encontró información suficiente en la documentación indexada, sin incluir contenido generado fuera del contexto recuperado, y registrar el evento en el log del sistema.
8. WHEN un Usuario solicita cerrar una Sesión_Chat, THE Backend SHALL cambiar el estado de la Sesión_Chat a Cerrada y registrar la marca de tiempo de cierre en un plazo máximo de 3 segundos.
9. IF el Motor_RAG no responde en un plazo de 15 segundos desde la recepción del mensaje del Usuario, THEN THE Backend SHALL cancelar la consulta, devolver al Cliente un mensaje de error indicando que el servicio no está disponible, y preservar el historial previo de la sesión sin modificaciones.
10. IF un Usuario intenta enviar un mensaje en una Sesión_Chat con estado Cerrada, THEN THE Backend SHALL rechazar la solicitud y devolver al Cliente un mensaje de error indicando que la sesión está cerrada.

---

### Requisito 8: Revisión y Aprobación de Contenidos Generados por IA

**Historia de usuario:** Como Líder_QA, quiero revisar, modificar y aprobar los borradores generados por el asistente de IA antes de incorporarlos al Proyecto, para garantizar la calidad y veracidad del contenido antes de su uso formal.

#### Criterios de aceptación

1. WHEN el Motor_RAG genera un borrador de documento, caso de prueba, historia de usuario u otro artefacto, THE Backend SHALL persistirlo en estado Borrador_IA con el contenido generado, la Sesión_Chat de origen y la marca de tiempo.
2. THE Cliente SHALL presentar cada Borrador_IA de forma diferenciada respecto al contenido aprobado, indicando visualmente su estado provisional.
3. WHEN un Líder_QA edita un Borrador_IA, THE Backend SHALL persistir la versión editada sin sobrescribir el contenido original generado por el Motor_RAG, manteniendo ambas versiones trazables.
4. WHEN un Líder_QA aprueba un Borrador_IA, THE Backend SHALL cambiar el estado del artefacto a Aprobado, registrar el identificador del aprobador y la marca de tiempo, e impedir modificaciones posteriores del contenido aprobado sin crear una nueva versión.
5. THE Sistema SHALL prohibir la incorporación automática de contenido generado por el Motor_RAG a artefactos formales del Proyecto (Casos_Prueba, Documentos_Versionados) sin la aprobación explícita de un Usuario con rol Líder_QA o superior.
6. THE Backend SHALL registrar en el Registro_Auditoría cada generación, edición y aprobación de Borrador_IA, incluyendo el identificador del Proyecto, el tipo de artefacto y el identificador del Usuario que realizó cada acción.

---

### Requisito 9: Ingesta Documental en el Índice RAG

**Historia de usuario:** Como Administrador o Líder_QA, quiero cargar documentos corporativos al índice vectorial del Motor_RAG por Proyecto, para que el asistente de IA disponga de contexto actualizado y relevante al responder consultas.

#### Criterios de aceptación

1. WHEN un Administrador o Líder_QA carga uno o más documentos para ingesta, THE Backend SHALL iniciar el proceso de Ingesta de forma asíncrona, devolver inmediatamente un identificador de tarea y el estado Procesando al Cliente.
2. THE Backend SHALL aceptar documentos para ingesta con tipo MIME: application/pdf, text/plain, text/markdown, application/vnd.openxmlformats-officedocument.wordprocessingml.document, con tamaño máximo de 50 MB por documento.
3. IF el tipo MIME o el tamaño de un documento supera los límites de ingesta, THEN THE Backend SHALL rechazar la carga con HTTP 422 antes de iniciar la Ingesta, con un mensaje que describa el límite excedido.
4. WHEN la Ingesta de un documento finaliza exitosamente, THE Motor_RAG SHALL actualizar el índice vectorial del Proyecto correspondiente y THE Backend SHALL registrar en la BD el documento con nombre, tipo MIME, tamaño, fecha de ingesta, número de fragmentos indexados y estado Indexado.
5. IF la Ingesta de un documento falla por error de procesamiento, THEN THE Backend SHALL registrar el documento con estado Error_Ingesta, el mensaje de error técnico y la fecha del intento, sin afectar los documentos previamente indexados.
6. THE Backend SHALL permitir consultar el estado de una tarea de Ingesta en curso (Procesando / Indexado / Error_Ingesta) mediante el identificador de tarea devuelto en el paso 1.
7. WHEN un Administrador o Líder_QA elimina un documento del índice, THE Motor_RAG SHALL remover los fragmentos correspondientes del índice vectorial y THE Backend SHALL actualizar el estado del documento a Eliminado en la BD.
8. THE Backend SHALL registrar en el Registro_Auditoría cada carga, ingesta exitosa, error de ingesta y eliminación de documento.

---

### Requisito 10: Importación y Exportación mediante Hojas de Cálculo

**Historia de usuario:** Como Líder_QA, quiero importar y exportar datos del Proyecto (casos de prueba, historias de usuario, defectos) en formato XLSX, para intercambiar información con herramientas externas y generar reportes para los interesados.

#### Criterios de aceptación

1. WHEN un Líder_QA solicita una Exportación de Casos_Prueba, Historias_Usuario, Defectos o Ejecuciones de un Proyecto, THE Backend SHALL generar un archivo XLSX con los datos solicitados, con encabezados de columna en español, y devolverlo como descarga en la respuesta HTTP.
2. THE Backend SHALL completar la generación del archivo XLSX de Exportación en un máximo de 30 segundos para conjuntos de datos de hasta 5000 registros.
3. WHEN un Líder_QA carga un archivo XLSX para Importación de Casos_Prueba o Historias_Usuario, THE Backend SHALL validar la estructura del archivo (presencia y tipo de columnas obligatorias) antes de persistir los datos.
4. IF el archivo XLSX de Importación contiene filas con campos obligatorios ausentes o con tipos de datos incorrectos, THEN THE Backend SHALL rechazar la importación completa con HTTP 422 y devolver un reporte de errores que identifique cada fila y columna con inconformidades, sin persistir ningún registro parcial.
5. WHEN la Importación es exitosa, THE Backend SHALL persistir todos los registros del archivo XLSX en la BD dentro de una transacción atómica y devolver el conteo de registros importados.
6. THE Backend SHALL registrar en el Registro_Auditoría cada Exportación e Importación exitosa, incluyendo el identificador del Usuario, el tipo de entidad, el número de registros procesados y la marca de tiempo.

---

### Requisito 11: Trazabilidad y Auditoría

**Historia de usuario:** Como Administrador, quiero que el Sistema registre de forma inmutable todas las operaciones críticas, para garantizar la trazabilidad completa de las acciones sobre el Proyecto y cumplir con las políticas corporativas de auditoría.

#### Criterios de aceptación

1. THE Backend SHALL registrar un Registro_Auditoría para cada una de las siguientes operaciones: autenticación exitosa y fallida, creación/modificación/eliminación de Proyecto, Iteración, Historia_Usuario, Caso_Prueba, Ejecución, Defecto, Sesión_UAT, Documento_Versionado, Borrador_IA, Plantilla_Documental, importación/exportación, ingesta/eliminación de documento RAG y asignación/modificación de roles.
2. THE Registro_Auditoría SHALL contener: identificador único, identificador del Usuario, rol del Usuario al momento de la acción, tipo de operación, identificador de la entidad afectada, tipo de entidad afectada, dirección IP del Cliente, marca de tiempo UTC y resultado (Éxito / Error).
3. THE Backend SHALL garantizar que los registros de auditoría sean de solo inserción (append-only); queda prohibida la modificación o eliminación de registros de auditoría existentes.
4. WHEN un Administrador consulta el Registro_Auditoría, THE Backend SHALL devolver los registros filtrados por rango de fechas, tipo de operación, identificador de Usuario o tipo de entidad, con paginación de hasta 100 registros por página.
5. THE Backend SHALL devolver los resultados del Registro_Auditoría ordenados por marca de tiempo descendente de forma predeterminada.
6. THE Backend SHALL completar las consultas de Registro_Auditoría para rangos de hasta 90 días en un máximo de 5 segundos.

---

### Requisito 12: Distribución y Ejecución como Aplicación de Escritorio

**Historia de usuario:** Como Administrador de TI corporativo, quiero que la aplicación cliente se distribuya como un ejecutable Windows firmado que no requiera Python ni el runtime .NET, para garantizar el cumplimiento de las políticas corporativas de instalación de software.

#### Criterios de aceptación

1. THE Sistema SHALL compilar el Cliente como un instalador ejecutable (.msi o .exe) para Windows mediante Tauri 2.x, sin depender del runtime .NET en ninguna de sus versiones.
2. THE Cliente SHALL ejecutarse en Windows 10 (versión 1903 o posterior) y Windows 11 sin instalación de dependencias adicionales por parte del usuario final.
3. THE Cliente SHALL requerir Microsoft Edge WebView2 Runtime; IF WebView2 Runtime no está disponible en el equipo, THEN THE Cliente SHALL mostrar al Usuario un mensaje con instrucciones para instalarlo y no iniciar la interfaz gráfica.
4. THE Cliente SHALL consumir el Backend exclusivamente a través de HTTPS/JSON; queda prohibida cualquier comunicación directa con la BD o el Motor_RAG desde el Cliente.
5. THE Cliente SHALL obtener la URL del Backend desde un archivo de configuración editable por el Administrador de TI, sin recompilar el ejecutable para cambiar de ambiente.
6. IF el Cliente no puede establecer conexión con el Backend al iniciar o durante la sesión, THEN THE Cliente SHALL mostrar al Usuario un mensaje de error descriptivo que indique que el servicio no está disponible y sugiera contactar al administrador, sin exponer detalles técnicos de red.
7. THE Cliente SHALL almacenar el JWT exclusivamente en memoria de proceso durante la sesión activa; queda prohibido persistir el JWT en disco (archivos, registro de Windows, almacenamiento del navegador).
8. THE Cliente SHALL firmar digitalmente el ejecutable con el certificado de firma de código corporativo antes de su distribución.
9. THE Sistema SHALL distribuir el ejecutable del Cliente sin incluir secretos embebidos (claves de API, cadenas de conexión, credenciales de servicio).

---

### Requisito 13: Seguridad de las Comunicaciones y del Backend

**Historia de usuario:** Como Administrador de TI, quiero que todas las comunicaciones entre el Cliente y el Backend sean seguras y que la autorización se evalúe exclusivamente en el servidor, para proteger los datos corporativos y cumplir los estándares de seguridad de la organización.

#### Criterios de aceptación

1. THE Backend SHALL exponer todos sus endpoints exclusivamente sobre HTTPS con TLS 1.2 o superior; queda prohibida la exposición de endpoints sobre HTTP plano.
2. THE Backend SHALL implementar CORS con lista de orígenes permitidos configurada explícitamente; queda prohibida la configuración de CORS con comodín (`*`) en entornos de producción.
3. THE Backend SHALL evaluar la autorización de cada endpoint en el servidor mediante validación del JWT y del rol del Usuario; el Cliente no participa en la evaluación de permisos.
4. THE Backend SHALL incluir en todas las respuestas HTTP los encabezados de seguridad: `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options` y `Content-Security-Policy`.
5. THE Backend SHALL aplicar límite de tasa (rate limiting) de 200 peticiones por minuto por JWT en endpoints de uso general y de 10 peticiones por minuto por JWT en el endpoint de autenticación.
6. IF una petición supera el límite de tasa configurado, THEN THE Backend SHALL responder con HTTP 429 y el encabezado `Retry-After` con el tiempo de espera en segundos.
7. THE Backend SHALL validar y sanear todos los parámetros de entrada recibidos (cadenas, identificadores, archivos) antes de procesarlos, utilizando un esquema de validación declarativo (Pydantic) para cada endpoint.
8. THE Backend SHALL utilizar consultas parametrizadas en todas las interacciones con la BD; queda prohibida la construcción de sentencias SQL por concatenación de cadenas de entrada del Usuario.

---

### Requisito 14: Integración con Jira

**Historia de usuario:** Como Líder_QA, quiero sincronizar defectos del Sistema con Jira, para que los equipos de desarrollo reciban los defectos en su herramienta de gestión habitual sin duplicación manual.

#### Criterios de aceptación

1. WHERE la integración con Jira esté habilitada en la configuración del Proyecto, THE Backend SHALL permitir al Líder_QA sincronizar un Defecto como incidencia en el proyecto Jira configurado, enviando título, descripción, severidad y el identificador del Defecto en el Sistema como referencia.
2. WHEN la sincronización de un Defecto con Jira es exitosa, THE Backend SHALL registrar en el Defecto el identificador de la incidencia Jira creada y la fecha de sincronización.
3. IF la sincronización con Jira falla por error de conectividad o credenciales, THEN THE Backend SHALL registrar el error en el Registro_Auditoría y devolver al Cliente un mensaje descriptivo del fallo sin interrumpir las operaciones no relacionadas con Jira.
4. THE Backend SHALL almacenar las credenciales de la API de Jira cifradas en la BD; queda prohibido almacenarlas en texto plano o transmitirlas al Cliente.
5. WHEN un Defecto sincronizado con Jira cambia de estado en el Sistema, THE Backend SHALL ofrecer al Líder_QA la opción de actualizar el estado de la incidencia correspondiente en Jira.

---

### Requisito 15: Evolución hacia Aplicación Web sin Reescritura del Backend

**Historia de usuario:** Como Arquitecto de TI, quiero que el Backend esté diseñado para ser consumido también por un cliente web futuro, para proteger la inversión en lógica de negocio y permitir la evolución de la plataforma sin reescribir el servidor.

#### Criterios de aceptación

1. THE Backend SHALL exponer su API REST con los mismos endpoints, contratos JSON y mecanismos de autenticación JWT independientemente de si el Cliente es la aplicación Tauri o una aplicación web.
2. THE Backend SHALL documentar todos sus endpoints mediante OpenAPI 3.0 (Swagger), accesible en una ruta dedicada del servicio.
3. THE Sistema SHALL separar la lógica de negocio y de datos del Backend de cualquier dependencia específica del Cliente Tauri; queda prohibido incluir en el Backend código que asuma el entorno de escritorio.
4. THE Backend SHALL gestionar el estado de sesión exclusivamente mediante JWT sin mantener estado de sesión en memoria del servidor (arquitectura stateless), de modo que un cliente web futuro pueda autenticarse con el mismo mecanismo.

---

### Requisito 16: Validación Tecnológica (PoC Fase 0)

**Historia de usuario:** Como Arquitecto de TI, quiero validar que el stack Tauri 2.x + FastAPI + PostgreSQL es compatible con las políticas corporativas antes de iniciar el desarrollo completo, para identificar y mitigar bloqueos tecnológicos con el mínimo costo.

#### Criterios de aceptación

1. THE Sistema SHALL demostrar mediante una prueba de concepto (PoC) ejecutable que el instalador Tauri 2.x se instala y ejecuta correctamente en un equipo Windows con las políticas corporativas de antivirus y control de aplicaciones activas.
2. THE PoC SHALL verificar que WebView2 Runtime está disponible o puede instalarse en los equipos corporativos del entorno objetivo.
3. THE PoC SHALL demostrar que el Cliente Tauri establece una conexión HTTPS con el Backend FastAPI a través del proxy corporativo, autentica un usuario y recibe un JWT válido.
4. THE PoC SHALL ejecutarse sin instalar Python en el equipo del usuario final; el Backend SHALL operar en un servidor remoto accesible vía HTTPS.
5. IF el instalador Tauri es bloqueado por el antivirus corporativo o las políticas de ejecución, THEN THE equipo de arquitectura SHALL documentar el bloqueo, la causa raíz y las alternativas técnicas evaluadas antes de continuar con la Fase 1.

---

## Requisitos No Funcionales

### RNF-01: Rendimiento

1. THE Backend SHALL responder al 95 % de las peticiones de la API REST (excluidas las de generación de documentos e ingesta) en menos de 500 ms bajo carga concurrente de hasta 20 usuarios simultáneos.
2. THE Motor_RAG SHALL devolver la primera respuesta de chat en menos de 10 segundos bajo carga de hasta 5 sesiones de chat concurrentes.
3. THE Backend SHALL completar la generación de un archivo XLSX de Exportación de hasta 5000 registros en menos de 30 segundos.

### RNF-02: Disponibilidad y Recuperación

1. THE Backend SHALL registrar en un archivo de log estructurado (JSON) cada error no controlado con nivel ERROR, incluyendo traza de pila, marca de tiempo UTC e identificador de petición.
2. IF el Backend se reinicia, THE Backend SHALL recuperar su estado operativo sin intervención manual en menos de 60 segundos.

### RNF-03: Mantenibilidad

1. THE Backend SHALL gestionar las migraciones de esquema de la BD exclusivamente mediante Alembic; queda prohibida la modificación manual del esquema en producción.
2. THE Sistema SHALL separar la configuración de ambiente (URLs, credenciales externas, parámetros de seguridad) de el código fuente mediante variables de entorno o archivos de configuración externos no versionados.

### RNF-04: Compatibilidad Corporativa

1. THE Sistema SHALL operar sin depender del runtime .NET en ninguna versión, ni en el Cliente ni en el Backend.
2. THE Cliente SHALL ser distribuible como instalador estándar compatible con herramientas corporativas de despliegue de software (SCCM, Intune o equivalente).
