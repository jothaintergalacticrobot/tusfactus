# Hogar Compartido — Diseño de Producto y Arquitectura (MVP iOS)

> App nativa para iPhone orientada a un matrimonio para compartir la organización e intendencia del hogar, con **sincronización casi en tiempo real** entre dos usuarios, soporte offline básico y resolución de conflictos suficiente para un MVP.
>
> Rol del documento: propuesta ejecutable de Principal PM + Staff iOS Engineer + Solution Architect. Decisiones tomadas, no lluvia de ideas.

---

## TL;DR — Lo que hace esta app técnicamente más delicada de lo que parece

Las pantallas son fáciles (listas, calendario, checkboxes). **La dificultad real no se ve**: es que dos personas editan el mismo estado, a veces a la vez, a veces sin conexión, y ambos esperan verlo reflejado "al instante" y sin perder datos. Eso obliga a resolver:

1. **Propagación casi inmediata** de altas/ediciones/borrados entre dos dispositivos.
2. **Escrituras offline en cola** que deben reconciliarse al volver la red.
3. **Metadatos de sincronización** (timestamp de servidor, versión, autor, dispositivo).
4. **Política de conflictos explícita** por tipo de entidad (no una sola regla mágica).
5. **Borrados que no "resucitan"** (tombstones / soft delete).

**Por qué aun así es complejidad media y no un Google Docs:** con dos usuarios y entidades pequeñas e independientes (un evento, una tarea, un ítem de compra), **no necesitamos CRDTs ni OT**. Basta con **Last-Write-Wins a nivel de campo + soft delete + timestamps de servidor**, apoyándonos en un SDK que ya trae *offline cache*, *write queue* y *realtime listeners* de fábrica (**Firestore**). El truco de recorte de alcance es **dejar que el SDK haga el 80% del trabajo de sync** y reservar la lógica de producto solo para el 20% de conflictos que el usuario realmente percibe.

---

## 1. Resumen ejecutivo

### Qué problema resuelve
Una pareja coordina su vida doméstica hoy en canales dispersos (WhatsApp, notas sueltas, el calendario de uno, la lista de la compra en un papel). Se duplican compras, se olvidan cumpleaños, se pisan tareas y "creía que lo habías hecho tú". **La app centraliza la intendencia del hogar en un espacio compartido que se actualiza al instante en ambos móviles.**

### Público objetivo
- Parejas convivientes (matrimonio o similar), 25–55 años, ambos con iPhone.
- Usuarios no técnicos, que valoran simplicidad y fiabilidad por encima de features.
- Uso diario, en movimiento, a menudo con red mala (supermercado, sótano, calle).

### Propuesta de valor
> **"Lo que uno cambia, el otro lo ve al momento. Sin duplicados, sin olvidos, sin discutir quién hace qué."**

Tres promesas concretas:
1. **Un solo lugar** para calendario, tareas y compra del hogar.
2. **Tiempo real de verdad**: añades leche y tu pareja la ve mientras está en el súper.
3. **Funciona aunque falle la red**: escribes offline y se sincroniza solo al volver.

---

## 2. Supuestos del producto

| Categoría | Supuesto | Implicación de diseño |
|---|---|---|
| **Usuarios** | Exactamente 2 miembros por hogar en MVP (pareja). Confianza total entre ellos. | No hace falta control de permisos granular ni roles. Todo es lectura/escritura compartida. |
| **Escala** | 1 hogar = 2 personas. Volumen de datos pequeño (cientos–miles de ítems, no millones). | Modelo de datos simple; conflictos raros y de baja concurrencia. LWW es suficiente. |
| **Frecuencia** | Uso diario, ráfagas cortas (10–40 s). Picos en mañana (agenda) y tarde/noche (compra, cena, tareas). | Optimizar *time-to-first-action* y alta rápida. Widgets y notificaciones importan. |
| **Concurrencia** | Edición simultánea del **mismo objeto** es rara pero ocurre (misma tarea, mismo evento). Edición simultánea de **objetos distintos de la misma lista** es frecuente (dos añaden a la compra). | Conflictos de objeto: LWW. Concurrencia de lista: se resuelve sola porque cada ítem es un documento independiente. |
| **Red** | Conectividad intermitente. Supermercados con mala cobertura es un caso de uso central, no un edge case. | Offline-first no negociable. La app debe ser 100% usable sin red y reconciliar al volver. |
| **Dispositivos** | iPhone iOS 16+. iPad/Android/web fuera de MVP pero la arquitectura no debe cerrarles la puerta. | Backend cross-platform (Firestore) en vez de solución solo-Apple. |
| **Hábitos** | Uno tiende a "gestionar" más que el otro. Ambos quieren saber "quién hizo qué" sin fricción. | Activity log mínimo y atribución de autor visible pero discreta. |
| **Sesión** | Instalación una vez, sesión persistente. Emparejamiento se hace una sola vez al inicio. | Onboarding de emparejamiento debe ser a prueba de fallos (código de invitación simple). |

---

## 3. MVP priorizado

### Principio: el MVP es *colaboración doméstica fiable entre dos personas*, no un catálogo de features.

### ✅ ENTRA en el MVP

| # | Capacidad | Por qué es imprescindible |
|---|---|---|
| 1 | **Autenticación** (Sign in with Apple + email) | Sin identidad no hay hogar compartido ni atribución. |
| 2 | **Hogar compartido** (crear + emparejar por código de invitación) | Es *el* concepto central del producto. Todo cuelga del hogar. |
| 3 | **Sincronización en tiempo real** | Requisito no negociable. Es la razón de ser de la app. |
| 4 | **Calendario compartido** (crear/editar/borrar, mes/día, responsable, recordatorios, filtro por miembro) | Coordinación de agenda es el caso de uso #1 de una pareja. |
| 5 | **Tareas compartidas** (crear/completar/editar, responsable, fecha límite, prioridad) | Reparto del hogar, alta frecuencia de uso. |
| 6 | **Lista de la compra compartida** (añadir/marcar/borrar, tiempo real, categorías básicas) | Caso "uno añade mientras el otro compra" = demo killer del tiempo real. |
| 7 | **Recordatorios / notificaciones push básicas** | "El otro creó/modificó algo relevante" + recordatorios de eventos/tareas. |
| 8 | **Soporte offline básico + resincronización** | Uso real en súper/calle. Incluido casi "gratis" vía SDK. |
| 9 | **Activity log mínimo** (quién creó/editó/completó/borró y cuándo) | Confianza y transparencia entre la pareja; barato de implementar. |

### ❌ NO entra en el MVP

Cumpleaños (V1.5), recetario, meal planning, importación de email, IA, widgets avanzados, Smart Add por lenguaje natural, roles/permisos, hogares de >2, comentarios en tareas, adjuntos.

### Por qué **este** MVP ya permite lanzar
- Cubre los **3 flujos diarios reales** de una pareja: *qué tenemos que hacer* (tareas), *dónde tenemos que estar* (calendario), *qué falta en casa* (compra).
- Demuestra la **propuesta de valor diferencial** (tiempo real + offline) en el minuto 1 de uso.
- Es **autocontenido**: no depende de integraciones externas frágiles (email, IA) que retrasan la salida y añaden riesgo.
- El resto de features son **aditivas**: se pueden añadir sin rehacer el núcleo de sync ni el modelo de datos.

---

## 4. Funcionalidades fuera del MVP

| Feature | Decisión | Fase | Justificación |
|---|---|---|---|
| **Cumpleaños y fechas importantes** | Diferir | **V1.5** | Es casi "un evento recurrente anual con recordatorio". Barato *después*, pero no aporta al núcleo de sync. Fácil de encajar reusando `Event`. |
| **Widgets básicos** (próximo evento, tareas de hoy, compra) | Diferir pero pronto | **V1.5** | Alto valor percibido, pero requieren que el core esté estable. Widgets = *lectura*, no añaden complejidad de sync. |
| **Smart Add (lenguaje natural)** | Diferir | **V2** | Muy atractivo pero es UX-candy, no núcleo. Requiere parsing/IA fiable; alto riesgo de frustración si falla. |
| **Recetario** | Diferir | **V2** | Feature grande y autónoma. No es coordinación en tiempo real; es una biblioteca personal. |
| **Meal planning** | Diferir | **V2** | Depende del recetario. Valor real solo cuando existe recetario + compra enlazada. |
| **Importación desde email** | Recortar | **V3+** | Altísima complejidad (parsing, permisos, privacidad, formatos infinitos) para valor incierto en pareja. Clásico agujero negro de esfuerzo. |
| **IA (ideas de recetas, sugerencias de cena)** | Recortar de V1 | **V2/V3** | Debe ser opcional y explicable. Sin recetario/meal plan no tiene dónde vivir. Coste y latencia añaden riesgo. |
| **Automatizaciones complejas** | Recortar | **V3+** | Sobre-ingeniería para 2 usuarios. Poca demanda real. |
| **Roles/permisos granulares** | Recortar | — | Contradice el supuesto de confianza total en una pareja. Complejidad pura sin valor. |
| **Reglas sofisticadas de conflicto (CRDT/merge de texto)** | Recortar | — | LWW a nivel de campo cubre el 99% de casos de dos personas. CRDT sería sobre-arquitectura. |
| **Hogares de >2 miembros / multi-hogar** | Recortar | **V3+** | El modelo lo permite (N miembros), pero la UX y los casos de conflicto se disparan. No es el público. |

**Regla de oro de recorte:** si una feature no mejora *coordinar el día a día entre dos personas en tiempo real*, no entra en V1.

---

## 5. Casos de uso principales

### Escenarios diarios
1. **Mañana / agenda.** Ana abre el widget "hoy": ve dos eventos y tres tareas. Añade "Recoger paquete 18:00" y lo asigna a Luis → Luis recibe push "Ana te asignó: Recoger paquete".
2. **Reparto de tareas.** Luis marca "Poner lavadora" como completada → desaparece de la lista de Ana en <1 s y el activity log muestra "Luis completó · 20:14".
3. **Compra en tiempo real (caso killer).** Luis está en el súper. Ana, desde casa, añade "leche" y "pan" a la lista → aparecen en el móvil de Luis mientras compra. Luis los marca como comprados → Ana ve que ya están.

### Escenario de edición concurrente (mismo objeto)
4. **Doble edición de un evento.** Ana cambia la hora de "Cena con Marta" a las 21:00. Casi a la vez, Luis cambia la ubicación. **Resultado deseado:** ambos cambios se conservan (son campos distintos → *merge* a nivel de campo). Si ambos cambian **el mismo campo**, gana el último timestamp de servidor (LWW), y el activity log deja rastro de que hubo dos ediciones.

### Escenarios offline
5. **Compra sin cobertura.** Luis en el sótano del súper (sin red) marca 6 ítems como comprados. La UI responde al instante (optimista). Al salir y recuperar red, los 6 cambios se suben solos; Ana los ve. Si Ana había borrado uno de esos ítems mientras tanto → el borrado gana (soft delete), y Luis ve que desapareció.
6. **Avión.** Ana crea 3 eventos en modo avión. Aparecen marcados con un indicador sutil de "pendiente de sincronizar". Al aterrizar y conectar, se suben en orden y el indicador desaparece.
7. **Conflicto tras reconexión.** Ambos editaron la misma tarea offline. Al reconectar, LWW por campo decide; ninguno pierde la app ni ve un error bloqueante. Como mucho, un evento en el log.

---

## 6. Arquitectura funcional

### Módulos del producto

```
┌──────────────────────────────────────────────────────────────┐
│                        HOGAR (Household)                       │
│  Contenedor raíz. Todo dato pertenece a un householdId.        │
└──────────────────────────────────────────────────────────────┘
        │
        ├── Identidad & Emparejamiento  (User, HouseholdMember)
        ├── Calendario                  (Event, Reminder)
        ├── Tareas                      (Task)
        ├── Compra                      (ShoppingList, ShoppingItem)
        ├── Notificaciones              (NotificationPreference, push)
        ├── Actividad                   (ActivityLog)
        └── Motor de Sincronización     (transversal: cache, cola, listeners)
```

| Módulo | Qué hace | Se relaciona con |
|---|---|---|
| **Identidad & Emparejamiento** | Login (Apple/email), crear hogar, generar/canjear código de invitación, gestionar miembros. | Es raíz de todo: emite `householdId` y `userId`. |
| **Calendario** | CRUD de eventos, vistas, filtro por miembro, búsqueda, recordatorios. | Genera `Reminder` y notificaciones; escribe `ActivityLog`. |
| **Tareas** | CRUD, completar, asignar, prioridad, fecha límite. | Notificaciones al asignar/vencer; `ActivityLog`. |
| **Compra** | CRUD de ítems, marcar comprado, categorías, modo compra. | El más "tiempo real"; `ActivityLog`. |
| **Notificaciones** | Preferencias por usuario, disparo de push ante cambios relevantes y recordatorios. | Consume eventos de todos los módulos. |
| **Actividad** | Registra quién hizo qué y cuándo. | Escrito por todos; solo lectura para el usuario. |
| **Motor de Sync** | Transversal. Listeners realtime, cache offline, cola de escritura, aplicación de política de conflictos, metadatos. | Envuelve a todos los módulos de datos. |

### Reglas de negocio más importantes
1. **Aislamiento por hogar:** ningún documento se lee/escribe sin `householdId` válido del usuario. (Seguridad + correctitud.)
2. **Todo cambio lleva autoría:** `createdBy`, `updatedBy`, `updatedByDeviceId`, timestamps de servidor.
3. **Borrado = soft delete:** nunca se borra físicamente en caliente; se marca `isDeleted + deletedAt`. Un job/tombstone limpia después.
4. **Idempotencia de completar:** marcar/desmarcar tarea o ítem es un set de estado, no un toggle ciego (evita "des-completar" por reordenación de eventos).
5. **Optimistic UI:** la UI aplica el cambio local al instante; el sync confirma o reconcilia en segundo plano.
6. **LWW por campo con timestamp de servidor** como política de conflicto por defecto; delete gana sobre update concurrente.

---

## 7. Arquitectura técnica recomendada

### Decisión principal de backend: **Firebase (Firestore + Auth + FCM + Cloud Functions)**

**Por qué Firestore y no CloudKit ni Supabase (para *este* producto):**

| Criterio | **Firestore (elegido)** | CloudKit | Supabase (Postgres) |
|---|---|---|---|
| Realtime nativo | ✅ Snapshot listeners instantáneos | ⚠️ Vía push/subscriptions, menos inmediato | ✅ Realtime, pero menos maduro en móvil |
| Offline + write queue de fábrica | ✅ Excelente, integrado en el SDK | ⚠️ Parcial, más manual | ⚠️ Manual |
| Cross-platform (Android/web futuro) | ✅ Total | ❌ Solo Apple | ✅ Total |
| Velocidad de construcción | ✅ Muy alta | ⚠️ Media | ⚠️ Media |
| Coste a escala de 2 usuarios | ✅ Prácticamente gratis | ✅ Gratis | ✅ Bajo |
| Push notifications | ✅ FCM integrado | ✅ APNs nativo | ⚠️ Requiere integrar APNs |

> **CloudKit** sería tentador (gratis, privado, nativo) pero **cierra la puerta a Android/web** (supuesto explícito del usuario) y su realtime es menos inmediato. **Firestore** resuelve de fábrica las 3 partes difíciles —*realtime, offline cache y write queue*— que son justo el núcleo del producto. Esa es la razón decisiva.

### Stack recomendado

| Capa | Elección | Justificación |
|---|---|---|
| **UI** | **SwiftUI** (iOS 16+) | Productividad máxima, *data-binding* reactivo ideal para estado que cambia en tiempo real, WidgetKit y Live Activities nativos. UIKit solo puntual si hace falta. |
| **Arquitectura app** | **MVVM + Repository** | ViewModels observan repositorios; repositorios envuelven al SDK. Testeable y desacopla UI del backend. |
| **Persistencia local** | **Cache offline de Firestore como fuente de verdad local** (no un store paralelo) | *Decisión de recorte clave:* evita mantener dos bases de datos (SwiftData + Firestore) y sincronizarlas a mano. Firestore ya persiste local, encola escrituras y reconcilia. |
| **Backend** | **Firestore** (NoSQL documental) | Ver arriba. |
| **Auth** | **Firebase Auth** con **Sign in with Apple** (obligatorio en App Store) + email/enlace mágico | Rápido, seguro, gestiona sesión y tokens. |
| **Realtime** | **Snapshot listeners de Firestore** | Propagación sub-segundo sin infra propia. |
| **Push** | **FCM → APNs**, disparadas por **Cloud Functions** ante escrituras relevantes | Notificar al *otro* miembro; recordatorios vía notificaciones locales + push. |
| **Lógica servidor** | **Cloud Functions** (mínima): fan-out de notificaciones, validación de invitaciones, limpieza de tombstones, mantener `ActivityLog` server-side. | Poca lógica, pero centraliza lo que no debe vivir en cliente. |
| **Widgets** | **WidgetKit** (lectura desde cache compartida via App Group) | Próximo evento / tareas de hoy / compra. |
| **Observabilidad** | **Firebase Crashlytics + Analytics + Performance** | Crashes, eventos clave (alta de evento, sync fallido), latencia de sync. Mínimo viable, cero infra. |

### Qué elijo para construir rápido sin hipotecar el producto
- **SwiftUI + Firestore**: máxima velocidad, y el modelo de datos documental por hogar escala a Android/web sin rehacer nada.
- **Reglas de seguridad de Firestore** (Security Rules) para el aislamiento por hogar → seguridad declarativa, no código.
- **No** montar servidor propio, ni WebSockets, ni base de datos que administrar. El único código servidor son Cloud Functions puntuales.

---

## 8. Sincronización en tiempo real entre ambos usuarios (detalle)

Esta es la sección crítica. La estrategia: **apoyarse en Firestore para el mecanismo, y añadir lógica de producto solo para la política de conflictos y la UX de estado pendiente.**

### 8.1 Cómo modelo la sincronización
- Cada entidad (evento, tarea, ítem) es **un documento independiente** bajo `households/{householdId}/...`.
- Cada dispositivo mantiene **snapshot listeners** activos sobre las colecciones que la UI muestra.
- Firestore mantiene una **cache local persistente**: lecturas y escrituras funcionan offline contra la cache, y el SDK reconcilia con el servidor cuando hay red.
- **UI optimista:** el cambio se ve al instante localmente; el servidor confirma en segundo plano.

### 8.2 Cómo se propagan altas, ediciones y borrados
| Operación | Mecanismo | Efecto en el otro dispositivo |
|---|---|---|
| **Alta** | `setDocument` con id generado en cliente + metadatos. | El listener del otro recibe un `added` → aparece en su lista. |
| **Edición** | `updateDocument` de **campos concretos** (no del doc entero) + `updatedAt = serverTimestamp()`, `version++`. | Listener recibe `modified` → fila se actualiza. Merge por campo natural. |
| **Borrado** | **Soft delete**: `update {isDeleted:true, deletedAt:serverTimestamp(), updatedBy}`. | Listener recibe `modified`; la UI filtra `isDeleted==true` → desaparece. |

### 8.3 Cómo se representa el estado "pendiente de sync"
Firestore expone en cada snapshot `metadata.hasPendingWrites` (true si el cambio aún no llegó al servidor) y `metadata.isFromCache`.
- **UI:** un indicador sutil (punto/ícono "sincronizando") en filas con `hasPendingWrites == true`.
- Una **bandera global** en la barra: "Sin conexión — los cambios se guardarán" cuando la red cae.
- No hace falta una tabla `PendingMutation` propia en MVP: **Firestore ya es la cola de escritura persistente**.

### 8.4 Metadatos por documento (todos los mutables los llevan)
```json
{
  "id": "evt_9f3...",
  "householdId": "hh_abc",
  "createdAt": "<serverTimestamp>",
  "createdBy": "user_ana",
  "updatedAt": "<serverTimestamp>",
  "updatedBy": "user_luis",
  "updatedByDeviceId": "iphone_luis_A1",
  "version": 7,
  "isDeleted": false,
  "deletedAt": null
}
```
- **`updatedAt` = timestamp de servidor** (no de dispositivo): evita relojes desincronizados, base de LWW.
- **`version`**: contador monótono para detectar/depurar ediciones perdidas y ordenar el log.
- **`updatedBy` / `updatedByDeviceId`**: autoría (activity log) y para no re-notificar al propio autor.

### 8.5 Timestamps, versionado y device/source metadata
- **Timestamps:** siempre `FieldValue.serverTimestamp()` para `updatedAt`/`deletedAt`. El cliente nunca es la autoridad temporal.
- **Versionado:** `version` se incrementa en cada escritura; permite auditoría y "esta fila cambió N veces".
- **Source metadata:** `updatedByDeviceId` distingue "mi cambio" de "cambio del otro" → suprime notificaciones al propio autor y permite mensajes tipo "Luis editó esto".

### 8.6 Política de conflictos por tipo de entidad

| Entidad | Política | Detalle |
|---|---|---|
| **Event** | **LWW por campo** | Campos distintos → se conservan ambos. Mismo campo → gana `updatedAt` mayor. |
| **Task** | **LWW por campo**, con `completed` idempotente | Completar es `set completed=true`, no toggle → sin condición de carrera. |
| **ShoppingItem** | **LWW por campo**; `purchased` como estado idempotente | Cada ítem es un doc → dos personas añadiendo ítems **no colisionan nunca**. |
| **ShoppingList / calendario (colección)** | **Sin conflicto de contenedor** | El "conflicto de lista" desaparece porque el contenido son documentos independientes. |
| **Borrado vs edición** | **Delete gana** | Si un doc tiene `isDeleted:true`, cualquier update concurrente no lo resucita. |

### 8.7 ¿Qué pasa si ambos editan el mismo objeto a la vez?
1. **Campos distintos** (Ana cambia hora, Luis cambia lugar) → `updateDocument` hace *merge* de campos → **ambos cambios sobreviven**. Resultado correcto sin intervención.
2. **Mismo campo** (ambos cambian la hora) → gana el que tiene **`serverTimestamp` mayor** (LWW). El perdedor no ve error; a lo sumo el `ActivityLog` registra dos ediciones seguidas.
3. **Aceptable para MVP:** no intentamos *merge* semántico de texto ni pedir al usuario que resuelva. Con dos personas la probabilidad de colisión de mismo-campo-mismo-segundo es marginal, y el coste de perder una edición trivial (mover 30 min una cena) es bajo y trazable.

### 8.8 Cómo manejo el borrado
- **Soft delete** (`isDeleted + deletedAt`) para evitar **resurrección** por eventos offline reordenados.
- La UI **filtra** los borrados; el usuario ve que desaparecen.
- **Tombstone cleanup:** una Cloud Function programada elimina físicamente los docs con `isDeleted:true` y > 30 días → mantiene la base ligera sin arriesgar resurrección durante el periodo de sync realista.
- **Undo:** como es soft delete, "deshacer" (V1.5) es trivial (`isDeleted=false`).

### 8.9 Offline básico
- Escrituras y lecturas van contra la **cache persistente de Firestore**; la app es 100% usable sin red.
- Los cambios quedan **encolados por el SDK** (durables en disco) y se reintentan automáticamente al recuperar conexión, **en orden**.
- La UI marca filas `hasPendingWrites` y muestra banner de "sin conexión".

### 8.10 Resincronización
- Al recuperar red, el SDK **sube la cola** y **descarga los cambios remotos** desde el último checkpoint (lo gestiona Firestore internamente).
- La reconciliación aplica **LWW por campo** con timestamps de servidor → estado convergente en ambos dispositivos.
- **Sin pull-to-refresh obligatorio**: los listeners actualizan solos; el gesto existe solo como tranquilizador de UX.

### 8.11 Reparto: qué resuelve el SDK vs la lógica de producto
| Lo resuelve **Firestore SDK** | Lo resuelve **lógica de producto** |
|---|---|
| Realtime listeners | Política de conflictos por entidad (LWW por campo, delete-wins) |
| Cache offline persistente | Soft delete + filtrado en UI |
| Cola de escritura durable + reintentos | Metadatos de autoría/versión y su significado |
| Merge de campos en `update` | UX de estado pendiente / offline / undo |
| Ordenación de escrituras encoladas | Disparo de notificaciones (Cloud Functions) y supresión al propio autor |

### 8.12 Límites aceptables del MVP
- **No** hay merge de texto carácter a carácter (si ambos reescriben una nota larga a la vez, gana uno). Aceptable para 2 usuarios.
- **No** hay resolución interactiva de conflictos ("elige tu versión"). LWW silencioso + log.
- **Latencia objetivo:** propagación típica **< 1 s** con red; **eventual** offline. No prometemos consistencia fuerte, sí *convergencia razonable*.
- **Ventana de resurrección:** tombstones a 30 días cubren cualquier reconexión realista de un móvil.

---

## 9. Modelo de datos

Estructura Firestore (jerárquica por hogar → seguridad y aislamiento naturales):

```
households/{householdId}
  ├─ members/{userId}          → HouseholdMember
  ├─ events/{eventId}          → Event
  ├─ tasks/{taskId}            → Task
  ├─ shoppingLists/{listId}    → ShoppingList
  │    └─ items/{itemId}       → ShoppingItem
  ├─ reminders/{reminderId}    → Reminder
  ├─ activity/{activityId}     → ActivityLog
  └─ (V1.5+) birthdays, recipes, mealPlans
users/{userId}                 → User (perfil global, fuera del hogar)
```

*Todos los campos de sync (`createdAt/By`, `updatedAt/By`, `updatedByDeviceId`, `version`, `isDeleted`, `deletedAt`) se omiten en las tablas por brevedad pero **aplican a toda entidad mutable del hogar**.*

### User — ✅ MVP
| Campo | Tipo | Notas |
|---|---|---|
| id | string | uid de Firebase Auth |
| displayName | string | |
| email | string | |
| avatarColor | string | color/emoji para distinguir miembros sin fotos |
| deviceTokens | [string] | tokens FCM para push |
| currentHouseholdId | string | hogar activo |

**Relaciones:** 1 User → N HouseholdMember (en MVP, 1). **Sync:** perfil, cambia poco; LWW.

### Household — ✅ MVP
| Campo | Tipo | Notas |
|---|---|---|
| id | string | |
| name | string | "Casa de Ana y Luis" |
| inviteCode | string | código corto para emparejar; se invalida al usarse |
| memberIds | [string] | máx 2 en MVP |
| createdBy | string | |

**Relaciones:** raíz de todo. **Sync:** raro; LWW.

### HouseholdMember — ✅ MVP
| Campo | Tipo | Notas |
|---|---|---|
| userId | string | |
| displayName | string | denormalizado para render rápido |
| avatarColor | string | |
| joinedAt | timestamp | |
| role | enum | `owner`/`member` (informativo; sin permisos en MVP) |

**Relaciones:** subcolección de Household. **Sync:** LWW.

### Event — ✅ MVP
| Campo | Tipo | Notas |
|---|---|---|
| id | string | generado en cliente (permite alta offline) |
| title | string | |
| startAt / endAt | timestamp | |
| allDay | bool | |
| location | string? | |
| notes | string? | |
| category | enum | trabajo/personal/hogar/otro |
| assigneeIds | [string] | 0, 1 o 2 miembros |
| reminderOffsets | [int] | minutos antes (múltiples recordatorios) |

**Relaciones:** genera `Reminder`; escribe `ActivityLog`. **Sync:** LWW por campo; merge natural de campos distintos.

### Task — ✅ MVP
| Campo | Tipo | Notas |
|---|---|---|
| id | string | |
| title | string | |
| completed | bool | **set idempotente**, no toggle |
| completedAt / completedBy | timestamp/string | para log |
| dueAt | timestamp? | |
| priority | enum | baja/media/alta |
| assigneeId | string? | |
| recurrenceRule | string? | RRULE simple (V1.5 amplía); MVP: none/daily/weekly |

**Relaciones:** notificaciones al asignar/vencer. **Sync:** LWW por campo; `completed` idempotente evita carreras.

### ShoppingList — ✅ MVP
| Campo | Tipo | Notas |
|---|---|---|
| id | string | |
| name | string | MVP: una lista por defecto "La compra" |
| archived | bool | |

**Relaciones:** contiene `ShoppingItem`. **Sync:** contenedor casi inmutable → sin conflictos.

### ShoppingItem — ✅ MVP
| Campo | Tipo | Notas |
|---|---|---|
| id | string | |
| name | string | |
| quantity | string? | "2 L", "3 uds" |
| category | enum | frutas/lácteos/limpieza/… (para agrupar) |
| purchased | bool | **set idempotente** |
| purchasedAt / purchasedBy | timestamp/string | |
| addedBy | string | |

**Relaciones:** subcolección de ShoppingList. **Sync:** cada ítem = doc independiente → **el caso "ambos añaden a la vez" no genera conflicto**. LWW en `purchased`.

### Reminder — ✅ MVP (implementación híbrida)
| Campo | Tipo | Notas |
|---|---|---|
| id | string | |
| sourceType | enum | event/task |
| sourceId | string | |
| fireAt | timestamp | |
| notified | bool | |

**Relaciones:** apunta a Event/Task. **Sync/nota:** los recordatorios se **agendan localmente** (UNUserNotificationCenter) para fiabilidad offline, y opcionalmente se refuerzan con push (FCM/Function) para el *otro* miembro. El doc `Reminder` es la fuente compartida; cada dispositivo reprograma su notificación local al recibir cambios.

### NotificationPreference — ✅ MVP (mínimo)
| Campo | Tipo | Notas |
|---|---|---|
| userId | string | |
| pushEnabled | bool | |
| notifyOnPartnerChange | bool | avisar cuando el otro crea/edita |
| notifyReminders | bool | |
| quietHoursStart/End | int? | opcional |

**Relaciones:** por usuario. **Sync:** LWW; casi sin conflicto (cada uno edita la suya).

### ActivityLog — ✅ MVP (mínimo)
| Campo | Tipo | Notas |
|---|---|---|
| id | string | |
| actorId | string | quién |
| verb | enum | created/updated/completed/deleted |
| entityType | enum | event/task/shoppingItem |
| entityId | string | |
| summary | string | "Añadió 'leche' a la compra" |
| at | timestamp | server |

**Relaciones:** referencia a cualquier entidad. **Sync/nota:** **append-only, inmutable** → sin conflictos por diseño. Se escribe idealmente en Cloud Function (o en cliente en MVP simple).

### PendingMutation — ⚠️ **No como entidad propia en MVP**
**Decisión explícita:** Firestore ya provee la cola de escritura persistente (`hasPendingWrites` + reintentos durables). **Mantener una tabla `PendingMutation` propia sería duplicar el mecanismo del SDK y una fuente de bugs.** Se reintroduciría solo si migramos a un backend sin cola nativa (p. ej. API REST propia) en el futuro.

### Recipe — ❌ V2
| Campo | Tipo |
|---|---|
| id, title, ingredients[], steps[], prepTime, servings, tags[] | — |

**Nota:** entidad aislada; se añade sin tocar el núcleo de sync.

### MealPlan — ❌ V2
| Campo | Tipo |
|---|---|
| id, weekStart, entries[{day, mealType, recipeId}] | — |

**Nota:** depende de Recipe; enlazará con ShoppingItem (generar compra desde ingredientes).

### Birthday — ❌ V1.5
| Campo | Tipo |
|---|---|
| id, personName, date, relationship, reminderOffsets[] | — |

**Nota:** se implementa como `Event` recurrente anual → reutiliza calendario y recordatorios, coste marginal.

### Resumen de entrada en MVP
| Entidad | MVP | Entidad | MVP |
|---|:--:|---|:--:|
| User | ✅ | ActivityLog | ✅ |
| Household | ✅ | PendingMutation | ⚠️ (no; lo hace el SDK) |
| HouseholdMember | ✅ | Birthday | ❌ V1.5 |
| Event | ✅ | Recipe | ❌ V2 |
| Task | ✅ | MealPlan | ❌ V2 |
| ShoppingList / ShoppingItem | ✅ | | |
| Reminder | ✅ | | |
| NotificationPreference | ✅ | | |

---

## 10. Pantallas y navegación

### Arquitectura de navegación: **Tab Bar de 4 pestañas**
Simplicidad máxima; cada pestaña = un caso de uso diario.

```
┌───────────────────────────────────────────────┐
│                                                 │
│              (contenido de pestaña)             │
│                                                 │
│    [ + ]  ← botón flotante de Alta Rápida       │
├───────────────────────────────────────────────┤
│  📅 Agenda   ✅ Tareas   🛒 Compra   ⚙️ Hogar   │
└───────────────────────────────────────────────┘
```

| Pestaña | Contenido MVP |
|---|---|
| **📅 Agenda** | Calendario (mes + lista del día). Filtro por miembro (chips Ana/Luis/Ambos). Búsqueda. Tap → detalle evento. |
| **✅ Tareas** | Lista de tareas (pendientes arriba, completadas colapsadas). Filtro por responsable. Swipe para completar. |
| **🛒 Compra** | Lista agrupada por categoría. Tap = marcar comprado (tachado). "Modo compra" oculta comprados. |
| **⚙️ Hogar** | Miembros, invitación, preferencias de notificación, **Actividad reciente** (activity log), cuenta. |

### Pantallas clave del MVP
1. **Onboarding / Auth** (Sign in with Apple).
2. **Crear o Unirse a un hogar** (generar código / introducir código).
3. Las 4 pestañas.
4. **Detalle + editor** de Evento / Tarea / Ítem (formularios simples).
5. **Alta rápida** (`+` global): hoja de acción → "Nuevo evento / tarea / ítem de compra" con el mínimo de campos.

### Flujos principales
- **Emparejar:** Auth → "Crear hogar" (genera código) → compartir por WhatsApp → el otro "Unirse" e introduce código → hogar activo.
- **Añadir a la compra en 2 taps:** `+` → "Compra" → escribir "leche" → Enter (añade y deja el cursor para el siguiente).
- **Completar tarea:** swipe derecha en la fila.

### Recomendaciones UX para máxima simplicidad
- **Alta rápida omnipresente** (`+`) y de bajísima fricción: añadir un ítem de compra debe costar < 3 s.
- **Atribución discreta:** avatar/color pequeño en cada fila ("lo añadió Ana") sin saturar.
- **Sin ajustes innecesarios:** una sola lista de compra por defecto, categorías predefinidas.
- **Feedback optimista inmediato** en cada acción.

### Qué quitaría para no sobrecargar
- Vista **semanal** del calendario (solo mes + día en MVP; semana en V1.5).
- Multi-listas de compra (una por defecto).
- Comentarios/adjuntos en tareas.
- Ajustes avanzados de recurrencia (solo none/daily/weekly).

### Cómo muestro estados offline / pendientes / conflictos
- **Offline:** banner fino no bloqueante arriba: *"Sin conexión · tus cambios se guardarán"*.
- **Pendiente de sync:** ícono sutil (reloj/nube) en filas con `hasPendingWrites`.
- **Conflicto:** **no** se muestra pop-up. LWW resuelve en silencio; si interesa, aparece en *Actividad reciente* ("Luis editó · Ana editó"). Solo el caso de **delete-vs-edit** podría mostrar un toast leve: *"Este elemento fue eliminado"*.

---

## 11. Riesgos técnicos y decisiones críticas

| Riesgo | Impacto | Mitigación |
|---|---|---|
| **Sync: ediciones perdidas por LWW** | Un cambio del usuario se sobrescribe. | LWW **por campo** (no por documento) reduce colisiones al mínimo; `ActivityLog` deja rastro; con 2 usuarios la probabilidad es baja. |
| **Sync: resurrección de borrados** | Ítem borrado reaparece tras reconexión. | **Soft delete + tombstones** de 30 días; delete gana sobre update. |
| **Reloj de dispositivo desincronizado** | LWW decide mal. | Usar **siempre `serverTimestamp()`**, nunca hora del cliente, para `updatedAt`. |
| **Complejidad de producto (scope creep)** | El MVP se hincha y no sale. | Disciplina de MVP (sección 3); features nuevas son aditivas y no tocan el core. |
| **Permisos/integraciones** | Import de email / IA meten fragilidad. | Excluidas de V1. |
| **Notificaciones ruidosas o duplicadas** | El usuario desactiva push. | Suprimir push al **propio autor** (`updatedByDeviceId`); preferencias por usuario; quiet hours; agrupar. |
| **Notificaciones no fiables (recordatorios)** | Se pierde un recordatorio importante. | Recordatorios como **notificaciones locales** (funcionan offline) + refuerzo push para el otro miembro. |
| **Datos inconsistentes entre pestañas/widget** | Widget muestra datos viejos. | Fuente única (cache Firestore vía App Group); refresco de widget al aplicar cambios. |
| **Seguridad: acceso a datos de otro hogar** | Fuga de datos. | **Firestore Security Rules**: solo miembros de `householdId` leen/escriben esa rama. Test de reglas en CI. |
| **Vendor lock-in (Firebase)** | Difícil migrar a futuro. | Aislar el SDK tras **repositorios**; el modelo documental por hogar es portable a Android/web/Supabase si hiciera falta. |
| **Bloqueo por conflicto visible al usuario** | Fricción/confusión. | Conflictos se resuelven **en silencio** (LWW); nunca se pide al usuario resolver en MVP. |

### Decisiones críticas (resumen)
1. **Firestore** como backend → resuelve realtime+offline+cola de fábrica. *(La decisión más importante.)*
2. **No** mantener store local paralelo ni tabla `PendingMutation` → menos código, menos bugs.
3. **LWW por campo + soft delete + serverTimestamp** como política única de conflictos.
4. **Recordatorios locales** + refuerzo push → fiabilidad offline.
5. **SwiftUI + MVVM + Repository** → velocidad y testabilidad.

---

## 12. Roadmap por fases

### Fase 1 — **MVP (lanzable)**  · objetivo ~8–10 semanas
Auth (Apple) · Crear/unir hogar · Sync realtime · Calendario (mes/día, filtro, búsqueda) · Tareas · Lista de la compra · Recordatorios/push básicos · Offline + resync · Activity log mínimo · Security Rules + Crashlytics.
**Criterio de salida:** dos personas usan la app un día completo; los cambios se propagan < 1 s con red y convergen tras offline; cero pérdida de datos percibida.

### Fase 2 — **V1.5** (afianzar, +4–6 semanas)
Widgets (próximo evento / tareas hoy / compra) · Cumpleaños (como evento recurrente) · Vista semanal del calendario · Undo de borrado · Recurrencia de tareas mejorada · Multi-lista de compra · Pulido UX y notificaciones.

### Fase 3 — **V2+**
Recetario · Meal planning (con generación de compra desde ingredientes) · Smart Add (lenguaje natural) · IA opcional (ideas de recetas / sugerencias de cena) · Android/web (el modelo ya lo soporta) · más adelante: import de email, automatizaciones, hogares de >2.

---

## 13. Recomendación final

- **Qué construiría primero:** el **eje emparejamiento → sync realtime → las 3 listas (agenda, tareas, compra)**. En cuanto "añado leche en un móvil y aparece en el otro" funciona con red y offline, el producto ya demuestra su valor. Todo lo demás es incremental.

- **Qué stack elegiría:** **SwiftUI (iOS 16+) + MVVM/Repository + Firebase (Firestore, Auth con Sign in with Apple, FCM, Cloud Functions mínimas) + WidgetKit**, con **la cache de Firestore como store local** y **Crashlytics/Analytics** para observabilidad. Es la vía más rápida a la App Store sin hipotecar Android/web.

- **Qué recortaría sin dudar:** import de email, IA, recetario y meal planning, Smart Add, roles/permisos, multi-hogar, y cualquier regla de conflicto sofisticada (CRDT/OT). Nada de eso toca el núcleo de coordinar a dos personas.

- **Qué no intentaría resolver perfectamente en V1:** el **merge semántico de conflictos**. LWW por campo + soft delete + activity log es "suficientemente bueno" para dos usuarios; perseguir consistencia perfecta multiplicaría el coste sin valor percibido.

- **Qué validaría con usuarios cuanto antes:**
  1. Que el **tiempo real y el offline** se sienten fiables en el súper (el caso killer).
  2. Que el **emparejamiento** se completa sin fricción a la primera.
  3. Que la **alta rápida** de compra/tareas es lo bastante rápida para usarse a diario.
  4. Que las **notificaciones** ayudan y no molestan (ajustar por defecto).

> **Cierre:** esta app parece una to-do list, pero su valor y su dificultad viven en la capa de sincronización entre dos personas. La forma de ganar es **hacer esa capa sólida apoyándose en un SDK que ya resuelve lo difícil (Firestore)**, aplicar una **política de conflictos simple pero explícita (LWW por campo + soft delete)**, y **recortar con disciplina** todo lo que no sea coordinar el hogar en tiempo real. Así se obtiene un MVP de complejidad media, fiable y lanzable.
