# Sistema de Diseño — Dayisaacstore

Tienda de anime · San Cristóbal, Táchira, Venezuela.
Marca derivada del logo: **círculo negro + monograma "DS" naranja + personaje en grises**.
Paleta elegida: **Pizarra fría** (gris azulado + naranja del logo).

> Fuente de verdad: variables CSS en `frontend-web/src/index.css` + mapeo en `frontend-web/tailwind.config.js`.
> Default de la app: **modo claro**, con oscuro disponible por toggle. Todo se construye con **tokens**, así cada pantalla soporta ambos modos automáticamente.

---

## 1. Marca

| Elemento | Valor |
|---|---|
| Nombre | **Dayisaacstore** |
| Tagline | Tienda anime · San Cristóbal, Táchira |
| Logo | Círculo negro, anillo "DAYISAAC-STORE" / "TIENDA ANIMÉ", monograma "DS" naranja, personaje (Goku) en grises |
| Archivo logo (web) | `frontend-web/public/logo.png` (favicon + componente `Logo`) |
| Color de marca | Naranja `#FF7A00` |
| Fondo de marca | Negro / grises |

**Regla de logo:** el círculo es **negro siempre**, en claro y oscuro. Si no existe `logo.png`, el componente `Logo` muestra un placeholder fiel (círculo negro + "DS" naranja).

---

## 2. Colores / Tokens (Pizarra fría)

Theming por clase: `darkMode: 'class'`. `:root` = claro, `.dark` = oscuro. Cualquier ancestro con la clase `dark` cambia el modo de su subárbol.

| Token | Variable CSS | Clase Tailwind | Claro | Oscuro | Rol |
|---|---|---|---|---|---|
| bg | `--bg` | `bg-bg` | `#F6F8FA` | `#0E1116` | Fondo base de la app |
| surface | `--surface` | `bg-surface` | `#FFFFFF` | `#161B22` | Tarjetas, paneles, modales |
| surface-alt | `--surface-alt` | `bg-surface-alt` | `#EDF1F5` | `#1D232C` | Superficie 2, filas alternas, hover |
| border | `--border` | `border-border` / `bg-border` | `#D9E0E7` | `#2A323D` | Bordes, divisores, inputs |
| text | `--text` | `text-text` | `#1A2129` | `#E7EDF3` | Texto principal y títulos |
| text-muted | `--text-muted` | `text-text-muted` | `#66707B` | `#8A97A5` | Texto secundario, labels, placeholders |
| accent | `--accent` | `text-accent` | `#E96B00` | `#FF8419` | Naranja para **texto/iconos/enlaces/activo** (versión legible AA) |
| accent-fill | `--accent-fill` | `bg-accent-fill` | `#FF7A00` | `#FF7A00` | **Relleno** naranja de marca (botón primario, logo) |
| accent-contrast | `--accent-contrast` | `text-accent-contrast` | `#FFFFFF` | `#0E1116` | Texto/icono **encima** del relleno naranja |
| success | `--success` | `text-success` / `bg-success` | `#16A34A` | `#22C55E` | Éxito (venta ok, stock ok, saldado) |
| warning | `--warning` | `text-warning` / `bg-warning` | `#B45309` | `#F59E0B` | Aviso (stock bajo, tasa por vencer) |
| danger | `--danger` | `text-danger` / `bg-danger` | `#DC2626` | `#EF4444` | Error, eliminar, deuda vencida |
| info | `--info` | `text-info` / `bg-info` | `#0369A1` | `#0EA5E9` | Información, "en vivo" |

### Reglas de color
- **Naranja:** usa `accent` para texto/iconos/estado activo; `accent-fill` para rellenos (botón primario); `accent-contrast` para el texto encima del relleno. En claro el texto naranja se oscurece a `#E96B00` para pasar contraste AA.
- **Un solo acento.** El naranja va solo en lo importante. El resto: neutros (los grises de la paleta).
- **PROHIBIDO el degradado multicolor** (naranja→rojo→magenta). Se veía "hecho con IA" y no es fiel al logo. Si hace falta un realce, naranja sólido.
- **Semánticos** (success/warning/danger/info) solo para su significado, vía componentes (`Badge`, `Alert`), no a mano por pantalla.

---

## 3. Tipografía

| Rol | Fuente | Clase Tailwind | Carga |
|---|---|---|---|
| Títulos | **Bricolage Grotesque** (variable) | `font-heading` | `@fontsource-variable/bricolage-grotesque` en `main.tsx` |
| Cuerpo | **Inter** (variable) | `font-body` | `@fontsource-variable/inter` en `main.tsx` |

**Escala sugerida** (Tailwind):
- Display / hero: `text-4xl`–`text-5xl` `font-extrabold` + `font-heading`
- H1: `text-2xl`–`text-3xl` `font-extrabold` `font-heading`
- H2 / sección: `text-xl` `font-bold` `font-heading`
- Cuerpo: `text-base` `font-body`
- Secundario / labels: `text-sm` / `text-xs` `text-text-muted`
- **Montos y números** (Bs/USD, KPIs): `font-heading font-extrabold` para que resalten.

Alternativa de fuentes (si se quiere tono más boutique): Fraunces (títulos) + Public Sans (cuerpo).

---

## 4. Espaciado, radios y elevación
- **Grilla de 8px.** Paddings/gaps en múltiplos de 4 (`p-2`, `p-3`, `p-5`, `gap-2`, `gap-4`).
- **Radios:** tarjetas `rounded-2xl` (16px); botones/inputs/badges chicos `rounded-xl` (12px); píldoras `rounded-full`.
- **Elevación:** una sola sombra sutil (`shadow-sm`) o borde de 1px (`border border-border`). Sin sombras exageradas ni glows.

---

## 5. Iconografía — Lucide

- Librería: **`lucide-react`** (web) · **`lucide-react-native`** (móvil, pendiente).
- Trazo: `strokeWidth={1.75}` (rango 1.5–2). Tamaño típico: 16–22 px.
- Color: `className="text-accent"` o el color del estado. **Siempre acompañado de etiqueta de texto.**
- Un solo set, un solo estilo. Nunca mezclar con emojis.

### Mapa de iconos (módulo → icono Lucide)
| Módulo / categoría | Icono |
|---|---|
| Dashboard | `LayoutDashboard` |
| Ventas | `ShoppingBag` |
| Inventario | `Package` |
| Alertas | `BellRing` |
| Auditoría | `ScrollText` |
| Tendencias / Histórico | `TrendingUp` |
| Usuarios | `Users` |
| Perfil | `CircleUserRound` |
| Tasas del día | `DollarSign` |
| Mi negocio | `Store` |
| Clientes / Deudas | `HandCoins` |
| Login | `LogIn` |
| Clientes (IG) | `Heart` |
| Concursos | `Trophy` |
| Personalización | `Brush` |
| Pedrería | `Gem` |
| Gorras | `Shirt` |
| Colecciones | `LayoutGrid` |
| Horario | `Clock` |
| Sensores (Dashboard) | `Thermometer` (temp), `Droplet` (hum), `Zap` (luz), `Siren` (buzzer), `DoorOpen` (puerta), `Activity` (movimiento) |

---

## 6. Componentes (existentes)

Ubicación: `frontend-web/src/components/ui/`.

### Button — `ui/Button.tsx`
Botón de acción tokenizado.
- **Props:** `variant?: 'primary' | 'secondary' | 'ghost' | 'danger'` (default `primary`) · `size?: 'sm' | 'md'` (default `md`) · `leftIcon?: ReactNode` · + todos los atributos de `<button>` (`onClick`, `disabled`, `type`…).
- **Variantes:**
  - `primary` → `bg-accent-fill text-accent-contrast` (naranja sólido de marca)
  - `secondary` → `bg-surface text-text border border-border`
  - `ghost` → solo texto, hover `surface-alt`
  - `danger` → `bg-danger text-white`
```tsx
<Button variant="primary" leftIcon={<ShoppingBag size={16} />}>Registrar venta</Button>
<Button variant="secondary" size="sm">Cancelar</Button>
```

### Badge — `ui/Badge.tsx`
Píldora de estado. Reemplaza los mini-mapas de color por página.
- **Props:** `tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent'` (default `neutral`) · `children`.
- Tinte calculado con `color-mix` sobre el token → se adapta a claro/oscuro.
```tsx
<Badge tone="success">Venta confirmada</Badge>
<Badge tone="danger">Deuda vencida</Badge>
```

### Card — `ui/Card.tsx`
Superficie base: tarjetas, paneles.
- **Props:** `children` · `className?`.
- Estilo: `bg-surface border border-border rounded-2xl p-5`.
```tsx
<Card><div className="text-xs uppercase text-text-muted">Ventas de hoy</div>…</Card>
```

### Alert — `ui/Alert.tsx`
Aviso/banner **real** (NO el recuadro pastel tipo IA): tarjeta con **barra lateral de color** + icono Lucide; el texto va en color neutro.
- **Props:** `tone?: 'info' | 'success' | 'warning' | 'danger'` (default `info`) · `title?` · `children?`.
```tsx
<Alert tone="warning" title="Stock bajo">Quedan 2 de "Figura Gojo Satoru".</Alert>
<Alert tone="danger" title="No se pudo entrar">{error}</Alert>
```

### Logo — `ui/Logo.tsx`
- **Props:** `size?: number` (default 64).
- Usa `/logo.png` si existe; si no, placeholder: círculo negro + "DS" naranja. El círculo es negro en ambos modos.
```tsx
<Logo size={48} />
```

---

## 7. Componentes pendientes (spec a construir en Fase 0)

| Componente | Reemplaza | Notas |
|---|---|---|
| `Input` + `Field` | `inputCls`/`Field` duplicados 4× | `Field` = label + ayuda; `Input` = `bg-bg border border-border rounded-xl`, focus `ring-accent`. Soporta `leftIcon`. |
| `Modal` | overlay inline de cada página | `fixed inset-0 bg-black/40` + `Card`, título + cerrar (`X` de Lucide), prop de ancho |
| `Table` | patrón de tabla copiado | contenedor `surface`+`border`, thead `surface-alt`, filas `divide-border`, hover `surface-alt` |
| `Tabs` / `TabButton` | tabs locales | activo `border-b-2 border-accent text-accent` |
| `Chip` (toggle) | chips moneda/método/tipo | activo `bg-accent-fill text-accent-contrast`, inactivo `surface-alt` |
| `KpiCard` | `Metrica`/KPI duplicados | `Card` + label uppercase + número `font-heading`, borde-izq de color por estado |
| `PageHeader` | títulos sueltos | título `font-heading` + acciones |

También en Fase 0:
- `ui/variants.ts` → `SEVERITY_VARIANT`, `ROLE_VARIANT`, `ESTADO_VARIANT` (un solo lugar para mapear significado→tono).
- `utils/chartColors.ts` → `CHART_COLORS` derivados de tokens (para las gráficas de Histórico).
- `theme/ThemeProvider` → toggle claro/oscuro + persistencia (localStorage), default claro.

---

## 8. Tailwind (resumen de `tailwind.config.js`)
```js
darkMode: 'class',
theme: { extend: {
  colors: {
    primary: '#c54d0d', primaryDark: '#f55200', // legado (se retira al final)
    bg:'var(--bg)', surface:'var(--surface)', 'surface-alt':'var(--surface-alt)',
    border:'var(--border)', text:'var(--text)', 'text-muted':'var(--text-muted)',
    accent:'var(--accent)', 'accent-fill':'var(--accent-fill)', 'accent-contrast':'var(--accent-contrast)',
    success:'var(--success)', warning:'var(--warning)', danger:'var(--danger)', info:'var(--info)',
  },
  fontFamily: {
    heading: ['"Bricolage Grotesque Variable"', 'system-ui', 'sans-serif'],
    body: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
  },
}}
```

---

## 9. Equivalente móvil (`mobile-app`)

> Pendiente (Fase 0 móvil). Requiere instalar `react-native-svg@^15` + `lucide-react-native` y **recompilar el APK** (New Architecture, RN 0.76).

- **Tokens:** en `app/utils/constants.ts`, definir `lightColors` y `darkColors` con las **mismas claves** que los tokens web (bg, surface, surface-alt, border, text, text-muted, accent, accent-fill, accent-contrast, success, warning, danger, info). Mantener `COLORS = lightColors` como default para compat.
- **Tema:** `ThemeContext` + `useTheme()` (con `useColorScheme`), y pasar el tema a `NavigationContainer` (`DefaultTheme`/`DarkTheme`).
- **Iconos:** wrapper `Icon` sobre `lucide-react-native`; mapa emoji→Lucide (mismo mapa que web). `color` alimentado del token activo.
- **Componentes:** equivalentes nativos de `Button`, `Card`, `Badge`, `Alert` (mismas variantes/tonos).
- **Logo:** `app/assets/logo.png`.

---

## 10. Principios — que NO se vea hecho con IA
1. **Un solo naranja sobre gris/negro** — sin degradados de varios colores.
2. **Neutros como base;** el naranja solo en lo importante (acción, activo, marca).
3. **Jerarquía por peso y tamaño** (Bricolage en títulos), no tiñendo todo de colores.
4. **Banners reales** (`Alert` con barra lateral + icono), no recuadros con relleno pastel.
5. **Iconos Lucide** de un solo estilo (trazo 1.75), siempre con etiqueta.
6. **Datos reales** en mocks: nombres de anime, montos en Bs y USD, fechas de San Cristóbal.
7. **Una sola elevación sutil** y radios coherentes. Sin glows ni sombras exageradas.
8. **Asimetría controlada** sobre la grilla de 8px (no todo perfectamente centrado).

## 11. Do & Don't
| ✅ Hacer | ❌ Evitar |
|---|---|
| `bg-surface`, `text-text`, `border-border` (tokens) | `bg-white`, `text-gray-900`, `#hex` sueltos |
| `<Badge tone="danger">` | mapas de color a mano por página |
| `<Alert tone="warning">` | recuadro pastel con `bg-X-100 text-X-700` |
| Iconos Lucide + etiqueta | emojis como iconos |
| Naranja sólido de marca | degradado naranja→rojo→magenta |

---

## 12. Estructura de archivos (web)
```
frontend-web/
├─ index.html                 # favicon → /logo.png, title "Dayisaacstore"
├─ public/logo.png            # logo real (lo coloca el dueño)
├─ tailwind.config.js         # darkMode:class + colores tokens + fuentes
└─ src/
   ├─ index.css               # tokens :root (claro) y .dark (oscuro) + fuentes
   ├─ main.tsx                # importa @fontsource-variable/{bricolage-grotesque,inter}
   ├─ components/ui/
   │  ├─ Button.tsx  Badge.tsx  Card.tsx  Alert.tsx  Logo.tsx   # ✅ hechos
   │  └─ (Input, Field, Modal, Table, Tabs, Chip, KpiCard, PageHeader, variants.ts)  # pendientes
   └─ pages/
      ├─ LoginPage.tsx         # ✅ aplicado (claro)
      └─ EstiloPage.tsx        # TEMPORAL (preview, se elimina en Fase 6)
```

---

_Última actualización: sistema base + Login aplicado. Ver el plan de migración en `~/.claude/plans/plan-marca-dayisaacstore.md`._
