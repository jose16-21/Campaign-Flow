import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FFlowModule,
  FCreateNodeEvent,
  FCreateConnectionEvent,
  FSelectionChangeEvent,
} from '@foblex/flow';
import { GetCampaignUseCase }     from '../../../application/use-cases/campaigns/get-campaign.use-case';
import { SaveCanvasUseCase }      from '../../../application/use-cases/campaigns/save-canvas.use-case';
import { ResolveAudienceUseCase } from '../../../application/use-cases/segments/resolve-audience.use-case';
import { CAMPAIGN_REPOSITORY }    from '../../../infrastructure/tokens/repository.tokens';
import { FilterBuilderComponent } from '../../../shared/components/filter-builder/filter-builder.component';
import type {
  Campaign,
  CanvasNode,
  CanvasEdge,
  SegmentNodeConfig,
  SmsNodeConfig,
  EmailNodeConfig,
  WhatsappNodeConfig,
  WhatsappTipo,
  WhatsappBoton,
  WhatsappSeccion,
  WhatsappOpcion,
} from '../../../domain/models/campaign.model';
import { TIPOS_ACCION, ICONO_NODO, LABEL_NODO, LOCALES_DISPONIBLES } from '../../../domain/models/campaign.model';
import type { FilterGroup }    from '../../../domain/models/filter-tree.model';
import type { AudienceResult } from '../../../domain/models/audience.model';
import type { Contact }        from '../../../domain/models/contact.model';
import {
  SMS_VARIABLES,
  resolverVariables,
  resolverVariablesEjemplo,
} from '../../../domain/models/sms-variables.model';

type PaletteItem = {
  type: 'segment' | 'sms' | 'email' | 'whatsapp';
  label: string;
  icon: string;
  wpTipo?: WhatsappTipo;
  section?: 'base' | 'wp';
};

const PALETA: PaletteItem[] = [
  // Nodos base
  { type: 'segment',  label: 'Segmento',     icon: ICONO_NODO.segment, section: 'base' },
  { type: 'sms',      label: 'SMS',          icon: ICONO_NODO.sms,     section: 'base' },
  { type: 'email',    label: 'Email',        icon: ICONO_NODO.email,   section: 'base' },
  // Nodos WhatsApp (cada uno es su propio tipo de nodo)
  { type: 'whatsapp', label: 'WP Texto',     icon: '💬', wpTipo: 'texto',     section: 'wp' },
  { type: 'whatsapp', label: 'WP Botones',   icon: '🔘', wpTipo: 'botones',   section: 'wp' },
  { type: 'whatsapp', label: 'WP Lista',     icon: '📜', wpTipo: 'lista',     section: 'wp' },
  { type: 'whatsapp', label: 'WP Media',     icon: '🖼',  wpTipo: 'media',     section: 'wp' },
  { type: 'whatsapp', label: 'WP Template',  icon: '📋', wpTipo: 'template',  section: 'wp' },
  { type: 'whatsapp', label: 'WP Condición', icon: '⬦',  wpTipo: 'condicion', section: 'wp' },
  { type: 'whatsapp', label: 'WP Ticket',    icon: '🎫', wpTipo: 'ticket',    section: 'wp' },
];

const WP_TIPO_META: Record<WhatsappTipo, { label: string; icon: string; color: string; bgColor: string }> = {
  texto:     { label: 'WP Texto',      icon: '💬', color: '#1a8a47', bgColor: '#f0fdf4' },
  template:  { label: 'WP Template',   icon: '📋', color: '#7c3aed', bgColor: '#f5f3ff' },
  botones:   { label: 'WP Botones',    icon: '🔘', color: '#075e54', bgColor: '#ecfdf5' },
  lista:     { label: 'WP Lista',      icon: '📜', color: '#0369a1', bgColor: '#f0f9ff' },
  media:     { label: 'WP Media',      icon: '🖼',  color: '#b45309', bgColor: '#fffbeb' },
  ticket:    { label: 'WP Ticket',     icon: '🎫', color: '#b91c1c', bgColor: '#fff1f2' },
  condicion: { label: 'Condición',     icon: '⬦',  color: '#b45309', bgColor: '#fff7ed' },
};

@Component({
  selector: 'app-campaign-editor',
  imports: [FFlowModule, FilterBuilderComponent],
  templateUrl: './campaign-editor.component.html',
  styleUrl: './campaign-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignEditorComponent implements OnInit {
  private readonly route           = inject(ActivatedRoute);
  private readonly router          = inject(Router);
  private readonly getUseCase      = inject(GetCampaignUseCase);
  private readonly saveUseCase     = inject(SaveCanvasUseCase);
  private readonly audienceUseCase = inject(ResolveAudienceUseCase);
  private readonly campañaRepo     = inject(CAMPAIGN_REPOSITORY);

  readonly campania          = signal<Campaign | null>(null);
  readonly nodos             = signal<CanvasNode[]>([]);
  readonly aristas           = signal<CanvasEdge[]>([]);
  readonly nodoActivo        = signal<CanvasNode | null>(null);
  readonly guardando         = signal(false);
  readonly activando         = signal(false);
  readonly cambiandoEstado   = signal(false);
  readonly editandoNombre    = signal(false);
  readonly error             = signal<string | null>(null);
  readonly exito             = signal<string | null>(null);
  readonly nodosConError          = signal<Set<string>>(new Set());
  readonly conexionesSeleccionadas = signal<string[]>([]);
  readonly audiencia         = signal<AudienceResult | null>(null);
  readonly cargandoAudiencia = signal(false);

  readonly paleta              = PALETA;
  readonly paletaBase          = PALETA.filter(i => i.section === 'base');
  readonly paletaWp            = PALETA.filter(i => i.section === 'wp');
  readonly variablesDisponibles = SMS_VARIABLES;
  readonly iconoNodo           = ICONO_NODO;
  readonly labelNodo           = LABEL_NODO;
  readonly locales             = LOCALES_DISPONIBLES;
  readonly wpTipoMeta          = WP_TIPO_META;
  private nextId = 1;
  private smsTextareaRef: HTMLTextAreaElement | null = null;

  // Map plano (no signal) para posiciones — evita disparar change detection durante el drag
  private readonly posiciones = new Map<string, { x: number; y: number }>();

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    try {
      const camp = await this.getUseCase.ejecutar(id);
      this.campania.set(camp);
      if (camp.canvas) {
        const nodos = camp.canvas.nodes ?? [];
        nodos.forEach(n => this.posiciones.set(n.id, { x: n.x, y: n.y }));
        this.nodos.set(nodos);
        // Auto-corregir aristas invertidas (SMS→Segmento) al cargar
        const aristasCargadas = (camp.canvas.edges ?? []).map(a => {
          const src = nodos.find(n => n.id === a.source);
          const tgt = nodos.find(n => n.id === a.target);
          const srcEsAccion = src && TIPOS_ACCION.includes(src.type);
          const tgtEsSegmento = tgt?.type === 'segment';
          return (srcEsAccion && tgtEsSegmento)
            ? { source: a.target, target: a.source }
            : a;
        });
        this.aristas.set(aristasCargadas);
        // nextId basado en el máximo índice "node-N" existente para evitar colisiones
        const maxIdx = nodos.reduce((max, n) => {
          const m = n.id.match(/^node-(\d+)$/);
          return m ? Math.max(max, parseInt(m[1], 10)) : max;
        }, 0);
        this.nextId = maxIdx + 1;
      }
    } catch {
      this.error.set('No se pudo cargar la campaña');
    }
  }

  getPosicion(nodo: CanvasNode): { x: number; y: number } {
    return this.posiciones.get(nodo.id) ?? { x: nodo.x, y: nodo.y };
  }

  onCrearNodo(evento: FCreateNodeEvent<PaletteItem>): void {
    if (!evento.data) return;
    const id  = `node-${this.nextId++}`;
    const pos = evento.dropPosition ?? { x: 200, y: 200 };
    let config: SegmentNodeConfig | SmsNodeConfig | EmailNodeConfig | WhatsappNodeConfig;
    if (evento.data.type === 'segment') {
      config = { filters: { op: 'AND', conditions: [] } };
    } else if (evento.data.type === 'email') {
      config = { subject: '', body: '' };
    } else if (evento.data.type === 'whatsapp') {
      config = this.buildWpConfig(evento.data.wpTipo ?? 'texto');
    } else {
      config = { message: '' };
    }
    this.posiciones.set(id, pos);
    this.nodos.update(n => [...n, { id, type: evento.data.type, x: pos.x, y: pos.y, config }]);
  }

  private buildWpConfig(tipo: WhatsappTipo): WhatsappNodeConfig {
    const base: WhatsappNodeConfig = { tipo };
    if (tipo === 'botones') {
      base.botones = [
        { id: `btn_${Date.now()}`,     texto: '' },
        { id: `btn_${Date.now() + 1}`, texto: '' },
      ];
    }
    if (tipo === 'lista') {
      base.secciones = [{ titulo: '', opciones: [{ id: `opt_${Date.now()}`, titulo: '' }] }];
    }
    if (tipo === 'media')     base.mediaType = 'image';
    if (tipo === 'condicion') { base.condicionCampo = ''; base.condicionOperador = 'eq'; base.condicionValor = ''; }
    return base;
  }

  // Solo actualiza el Map plano — sin signal → sin change detection → sin resetear posición
  onPosicionCambiada(nodeId: string, pos: { x: number; y: number }): void {
    if (!nodeId || !pos || typeof pos.x !== 'number' || typeof pos.y !== 'number'
        || isNaN(pos.x) || isNaN(pos.y)) return;
    this.posiciones.set(nodeId, pos);
  }

  onCrearConexion(evento: FCreateConnectionEvent): void {
    if (!evento.targetId) return;

    // outputId format:  "node-3_out"  (lineal)
    //                   "node-3__btn_1__out"  (botón/opción — doble guión)
    let sourceNodeId: string;
    let condicion: string | undefined;

    const rawSource = evento.sourceId;
    if (rawSource.includes('__')) {
      const parts = rawSource.split('__');
      sourceNodeId = parts[0];
      condicion    = parts[1];
    } else {
      sourceNodeId = rawSource.replace('_out', '');
    }

    const targetNodeId = evento.targetId.replace('_in', '');
    if (sourceNodeId === targetNodeId) return;

    // Auto-corregir dirección invertida acción → Segmento
    const sourceNodo = this.nodos().find(n => n.id === sourceNodeId);
    const targetNodo = this.nodos().find(n => n.id === targetNodeId);
    if (sourceNodo && TIPOS_ACCION.includes(sourceNodo.type) && targetNodo?.type === 'segment') {
      // No invertir si tiene condicion (ya es intencional)
      if (!condicion) {
        const arista: CanvasEdge = { source: targetNodeId, target: sourceNodeId };
        if (!this.aristas().some(a => a.source === arista.source && a.target === arista.target && !a.condicion)) {
          this.aristas.update(a => [...a, arista]);
        }
        return;
      }
    }

    // Obtener etiqueta del botón/opción/condicion
    let etiqueta: string | undefined;
    if (condicion && sourceNodo?.type === 'whatsapp') {
      const c = this.whatsappConfig(sourceNodo);
      if (c.tipo === 'condicion') {
        etiqueta = condicion === 'si' ? '✓ Sí' : '✗ No';
      } else {
        etiqueta = c.botones?.find(b => b.id === condicion)?.texto;
        if (!etiqueta) {
          for (const sec of c.secciones ?? []) {
            const opt = sec.opciones.find(o => o.id === condicion);
            if (opt) { etiqueta = opt.titulo; break; }
          }
        }
      }
    }

    const existe = this.aristas().some(
      a => a.source === sourceNodeId && a.target === targetNodeId && a.condicion === condicion,
    );
    if (!existe) {
      this.aristas.update(a => [...a, { source: sourceNodeId, target: targetNodeId, condicion, etiqueta }]);
    }
  }

  seleccionarNodo(nodo: CanvasNode): void {
    // Toggle para segmento (abre/cierra panel de filtros); para otros solo resaltar
    if (nodo.type === 'segment') {
      this.nodoActivo.set(this.nodoActivo()?.id === nodo.id ? null : nodo);
    } else {
      this.nodoActivo.set(nodo);
    }
    this.audiencia.set(null);
    this.conexionesSeleccionadas.set([]);
  }

  // ── Métodos inline: toman el nodo directamente (sin usar nodoActivo) ──

  private actualizarNodoDirecto(nodo: CanvasNode, config: SegmentNodeConfig | SmsNodeConfig | EmailNodeConfig | WhatsappNodeConfig): void {
    const actualizado = { ...nodo, config };
    this.nodos.update(ns => ns.map(n => n.id === nodo.id ? actualizado : n));
    if (this.nodoActivo()?.id === nodo.id) this.nodoActivo.set(actualizado);
  }

  actualizarCampoWp(nodo: CanvasNode, campo: keyof WhatsappNodeConfig, valor: unknown): void {
    const c = this.whatsappConfig(nodo);
    this.actualizarNodoDirecto(nodo, { ...c, [campo]: valor } as WhatsappNodeConfig);
  }

  actualizarTextoBotonDeNodo(nodo: CanvasNode, idx: number, texto: string): void {
    const c = this.whatsappConfig(nodo);
    const botones = (c.botones ?? []).map((b, i) => i === idx ? { ...b, texto } : b);
    const btnId = c.botones?.[idx]?.id;
    if (btnId) {
      this.aristas.update(as => as.map(a =>
        a.source === nodo.id && a.condicion === btnId ? { ...a, etiqueta: texto } : a
      ));
    }
    this.actualizarCampoWp(nodo, 'botones', botones);
  }

  actualizarTituloOpcionDeNodo(nodo: CanvasNode, secIdx: number, optIdx: number, titulo: string): void {
    const c = this.whatsappConfig(nodo);
    const optId = c.secciones?.[secIdx]?.opciones?.[optIdx]?.id;
    const secciones: WhatsappSeccion[] = (c.secciones ?? []).map((s, i) =>
      i === secIdx ? { ...s, opciones: s.opciones.map((o, j) => j === optIdx ? { ...o, titulo } : o) } : s
    );
    if (optId) {
      this.aristas.update(as => as.map(a =>
        a.source === nodo.id && a.condicion === optId ? { ...a, etiqueta: titulo } : a
      ));
    }
    this.actualizarCampoWp(nodo, 'secciones', secciones);
  }

  agregarBotonDeNodo(nodo: CanvasNode): void {
    const c = this.whatsappConfig(nodo);
    const botones = [...(c.botones ?? [])];
    if (botones.length >= 3) return;
    botones.push({ id: `btn_${Date.now()}`, texto: '' });
    this.actualizarCampoWp(nodo, 'botones', botones);
  }

  eliminarBotonDeNodo(nodo: CanvasNode, idx: number): void {
    const c = this.whatsappConfig(nodo);
    const eliminado = c.botones?.[idx];
    const botones = (c.botones ?? []).filter((_, i) => i !== idx);
    if (eliminado) {
      this.aristas.update(as => as.filter(a => !(a.source === nodo.id && a.condicion === eliminado.id)));
    }
    this.actualizarCampoWp(nodo, 'botones', botones);
  }

  agregarOpcionDeNodo(nodo: CanvasNode): void {
    const c = this.whatsappConfig(nodo);
    const secciones = (c.secciones ?? []).length
      ? (c.secciones ?? []).map((s, i) =>
          i === 0 ? { ...s, opciones: [...s.opciones, { id: `opt_${Date.now()}`, titulo: '' }] } : s
        )
      : [{ titulo: '', opciones: [{ id: `opt_${Date.now()}`, titulo: '' }] }];
    this.actualizarCampoWp(nodo, 'secciones', secciones);
  }

  eliminarOpcionDeNodo(nodo: CanvasNode, secIdx: number, optIdx: number): void {
    const c = this.whatsappConfig(nodo);
    const eliminada = c.secciones?.[secIdx]?.opciones?.[optIdx];
    const secciones: WhatsappSeccion[] = (c.secciones ?? []).map((s, i) =>
      i === secIdx ? { ...s, opciones: s.opciones.filter((_, j) => j !== optIdx) } : s
    );
    if (eliminada) {
      this.aristas.update(as => as.filter(a => !(a.source === nodo.id && a.condicion === eliminada.id)));
    }
    this.actualizarCampoWp(nodo, 'secciones', secciones);
  }

  actualizarTipoWpDeNodo(nodo: CanvasNode, tipo: WhatsappTipo): void {
    const base = this.whatsappConfig(nodo);
    if ((base.tipo === 'botones' || base.tipo === 'lista') && tipo !== base.tipo) {
      this.aristas.update(as => as.filter(a => !(a.source === nodo.id && a.condicion)));
    }
    const nuevo: WhatsappNodeConfig = { tipo, mensaje: base.mensaje };
    if (tipo === 'botones') {
      nuevo.botones = base.botones?.length
        ? base.botones
        : [{ id: `btn_${Date.now()}`, texto: '' }, { id: `btn_${Date.now() + 1}`, texto: '' }];
    }
    if (tipo === 'lista') {
      nuevo.secciones = base.secciones?.length
        ? base.secciones
        : [{ titulo: '', opciones: [{ id: `opt_${Date.now()}`, titulo: '' }] }];
    }
    if (tipo === 'template') { nuevo.templateNombre = base.templateNombre; nuevo.templateParams = base.templateParams; }
    if (tipo === 'media')     { nuevo.mediaType = base.mediaType ?? 'image'; nuevo.mediaUrl = base.mediaUrl; }
    if (tipo === 'ticket')    { nuevo.ticketTipo = base.ticketTipo; nuevo.mensajeFinal = base.mensajeFinal; }
    if (tipo === 'condicion') { nuevo.condicionCampo = base.condicionCampo; nuevo.condicionOperador = base.condicionOperador ?? 'eq'; nuevo.condicionValor = base.condicionValor; }
    this.actualizarNodoDirecto(nodo, nuevo);
  }

  actualizarSmsDeNodo(nodo: CanvasNode, message: string): void {
    this.actualizarNodoDirecto(nodo, { message } as SmsNodeConfig);
  }

  actualizarEmailDeNodo(nodo: CanvasNode, campo: 'subject' | 'body', valor: string): void {
    this.actualizarNodoDirecto(nodo, { ...this.emailConfig(nodo), [campo]: valor } as EmailNodeConfig);
  }

  eliminarNodo(nodo: CanvasNode): void {
    this.nodos.update(ns => ns.filter(n => n.id !== nodo.id));
    this.aristas.update(as => as.filter(a => a.source !== nodo.id && a.target !== nodo.id));
    if (this.nodoActivo()?.id === nodo.id) { this.nodoActivo.set(null); this.audiencia.set(null); }
  }

  // Clic en el cuerpo del nodo:
  // — Segmento: selecciona/abre panel (NO detiene propagación)
  // — Resto: detiene propagación (evita rebote con el canvas de foblex)
  onFormClick(nodo: CanvasNode, event: MouseEvent): void {
    if (nodo.type === 'segment') {
      this.seleccionarNodo(nodo);
    } else {
      event.stopPropagation();
    }
  }

  actualizarConfig(config: SegmentNodeConfig | SmsNodeConfig | EmailNodeConfig | WhatsappNodeConfig): void {
    const activo = this.nodoActivo();
    if (!activo) return;
    const actualizado = { ...activo, config };
    this.nodoActivo.set(actualizado);
    this.nodos.update(n => n.map(nd => nd.id === activo.id ? actualizado : nd));
  }

  actualizarNombre(nombre: string): void {
    const activo = this.nodoActivo();
    if (!activo) return;
    const actualizado = { ...activo, name: nombre.trim() || undefined };
    this.nodoActivo.set(actualizado);
    this.nodos.update(ns => ns.map(n => n.id === activo.id ? actualizado : n));
  }

  actualizarFiltros(filtros: FilterGroup): void {
    this.actualizarConfig({ filters: filtros } as SegmentNodeConfig);
  }

  actualizarMensaje(mensaje: string): void {
    this.actualizarConfig({ message: mensaje } as SmsNodeConfig);
  }

  async previewAudiencia(): Promise<void> {
    const nodo = this.nodoActivo();
    if (!nodo || nodo.type !== 'segment') return;
    const filtros = (nodo.config as SegmentNodeConfig).filters;
    if (!filtros || filtros.conditions.length === 0) return;
    this.cargandoAudiencia.set(true);
    try {
      this.audiencia.set(await this.audienceUseCase.ejecutar(nodo.id, filtros));
    } catch {
      this.error.set('Error al resolver audiencia');
    } finally {
      this.cargandoAudiencia.set(false);
    }
  }

  private validarReglasGrafo(): string | null {
    const nodos   = this.nodos();
    const aristas = this.aristas();

    if (nodos.length === 0) {
      return 'El canvas está vacío. Agrega al menos un Segmento y un nodo de acción conectados.';
    }

    const tieneSegmento = nodos.some(n => n.type === 'segment');
    const tieneAccion   = nodos.some(n => TIPOS_ACCION.includes(n.type));

    if (!tieneSegmento || !tieneAccion) {
      this.nodosConError.set(new Set(nodos.map(n => n.id)));
      return 'El canvas necesita al menos un nodo Segmento y una acción conectados para guardar.';
    }

    // Nodos SMS/Email deben tener Segmento como origen (no aplica a WhatsApp que puede ir WP→WP)
    const accionesNoWp = nodos.filter(n => n.type === 'sms' || n.type === 'email');
    const accionesNoWpDesconectadas = accionesNoWp.filter(accion =>
      !aristas.some(a => {
        if (a.target !== accion.id) return false;
        return nodos.find(n => n.id === a.source)?.type === 'segment';
      })
    );

    if (accionesNoWpDesconectadas.length > 0) {
      this.nodosConError.set(new Set(accionesNoWpDesconectadas.map(n => n.id)));
      const nombres = accionesNoWpDesconectadas.map(n => `"${this.etiquetaAccion(n)}"`).join(', ');
      return `Nodo(s) sin Segmento conectado: ${nombres}.`;
    }

    // Nodos WhatsApp deben tener Segmento u otro WhatsApp como origen (excepto si es el primero del flujo)
    const wpDesconectados = nodos
      .filter(n => n.type === 'whatsapp')
      .filter(wp => !aristas.some(a => {
        if (a.target !== wp.id) return false;
        const origen = nodos.find(n => n.id === a.source);
        return origen?.type === 'segment' || origen?.type === 'whatsapp';
      }));

    if (wpDesconectados.length > 0) {
      this.nodosConError.set(new Set(wpDesconectados.map(n => n.id)));
      const nombres = wpDesconectados.map(n => `"${this.etiquetaAccion(n)}"`).join(', ');
      return `Nodo(s) WhatsApp sin origen conectado: ${nombres}. Conecta desde un Segmento u otro nodo WhatsApp.`;
    }

    // Segmentos deben tener al menos una acción como destino
    const segmentosDesconectados = nodos
      .filter(n => n.type === 'segment')
      .filter(seg => !aristas.some(a => {
        if (a.source !== seg.id) return false;
        return nodos.find(n => n.id === a.target) !== undefined;
      }));

    if (segmentosDesconectados.length > 0) {
      this.nodosConError.set(new Set(segmentosDesconectados.map(n => n.id)));
      return 'Nodo(s) Segmento sin acción conectada como destino.';
    }

    this.nodosConError.set(new Set());
    return null;
  }

  private etiquetaAccion(nodo: CanvasNode): string {
    if (nodo.name) return nodo.name;
    if (nodo.type === 'sms')   return this.truncar(this.smsConfig(nodo).message);
    if (nodo.type === 'email') return this.emailConfig(nodo).subject || 'Sin asunto';
    if (nodo.type === 'whatsapp') {
      const c = this.whatsappConfig(nodo);
      if (c.tipo === 'texto')    return this.truncar(c.mensaje);
      if (c.tipo === 'template') return c.templateNombre || 'Sin template';
      if (c.tipo === 'botones')  return `Botones (${c.botones?.length ?? 0})`;
      if (c.tipo === 'lista')    return 'Lista de opciones';
      if (c.tipo === 'media')     return c.mediaType === 'video' ? 'Video' : c.mediaType === 'document' ? 'Documento' : 'Imagen';
      if (c.tipo === 'ticket')   return c.ticketTipo === 'venta' ? 'Ticket de venta' : 'Ticket de soporte';
      if (c.tipo === 'condicion') return `Si ${c.condicionCampo ?? '?'} ${c.condicionOperador ?? 'eq'} ${c.condicionValor ?? '?'}`;
    }
    return nodo.id;
  }

  async activarCampana(): Promise<void> {
    const camp = this.campania();
    if (!camp) return;
    this.activando.set(true);
    this.error.set(null);
    try {
      await this.campañaRepo.activar(camp.id);
      this.campania.set({ ...camp, status: 'ACTIVE' });
      this.exito.set('Campaña activada — mensajes enviados a la audiencia');
      setTimeout(() => this.exito.set(null), 5000);
    } catch {
      this.error.set('Error al activar la campaña. Verifica que el canvas esté guardado.');
    } finally {
      this.activando.set(false);
    }
  }

  async guardar(): Promise<void> {
    const camp = this.campania();
    if (!camp) return;

    const errorGrafo = this.validarReglasGrafo();
    if (errorGrafo) { this.error.set(errorGrafo); return; }

    this.guardando.set(true);
    this.error.set(null);
    try {
      // Sincroniza posiciones y filtra nodos inválidos antes de guardar
      const nodosActualizados = this.nodos()
        .filter(n => n.id && n.config)
        .map(n => {
          const pos = this.posiciones.get(n.id);
          return (pos && !isNaN(pos.x) && !isNaN(pos.y))
            ? { ...n, x: pos.x, y: pos.y }
            : n;
        });
      await this.saveUseCase.ejecutar(camp.id, {
        nodes: nodosActualizados,
        edges: this.aristas(),
      });
      this.exito.set('Canvas guardado correctamente');
      setTimeout(() => this.exito.set(null), 3000);
    } catch {
      this.error.set('Error al guardar el canvas');
    } finally {
      this.guardando.set(false);
    }
  }

  onSeleccionCambiada(evento: FSelectionChangeEvent): void {
    // foblex dispara eventos vacíos al hacer mousedown en cualquier lugar.
    // Solo se registran conexiones cuando hay IDs; se limpian explícitamente
    // al eliminar o al seleccionar un nodo.
    if (evento.connectionIds?.length) {
      this.conexionesSeleccionadas.set(evento.connectionIds);
    } else if (evento.nodeIds?.length) {
      // El usuario seleccionó un nodo → limpiar selección de conexión
      this.conexionesSeleccionadas.set([]);
    }
    // Evento vacío (click en canvas) → conservar selección hasta Delete
  }

  @HostListener('document:keydown', ['$event'])
  onTeclaPresionada(event: KeyboardEvent): void {
    if (event.key !== 'Delete' && event.key !== 'Backspace') return;
    // No interferir con inputs de texto
    const tag = (event.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (this.conexionesSeleccionadas().length > 0) {
      event.preventDefault();
      this.eliminarConexionesSeleccionadas();
    } else if (this.nodoActivo()) {
      event.preventDefault();
      this.eliminarNodoActivo();
    }
  }

  tieneAdvertencia(nodo: CanvasNode): boolean {
    if (nodo.type === 'sms') return !this.smsConfig(nodo).message?.trim();
    if (nodo.type === 'email') {
      const c = this.emailConfig(nodo);
      return !c.subject?.trim() || !c.body?.trim();
    }
    if (nodo.type === 'whatsapp') {
      const c = this.whatsappConfig(nodo);
      if (c.tipo === 'texto')    return !c.mensaje?.trim();
      if (c.tipo === 'template') return !c.templateNombre?.trim();
      if (c.tipo === 'botones')  return !(c.botones?.length) || c.botones.some(b => !b.texto.trim());
      if (c.tipo === 'lista')    return !(c.secciones?.length) || !c.bodyTexto?.trim();
      if (c.tipo === 'media')     return !c.mediaUrl?.trim();
      if (c.tipo === 'ticket')   return !c.ticketTipo;
      if (c.tipo === 'condicion') return !c.condicionCampo?.trim() || !c.condicionValor?.trim();
    }
    if (nodo.type === 'segment') return !(this.segmentConfig(nodo).filters?.conditions?.length);
    return false;
  }

  textoAdvertencia(nodo: CanvasNode): string {
    if (nodo.type === 'sms') return 'Mensaje vacío';
    if (nodo.type === 'email') {
      const c = this.emailConfig(nodo);
      if (!c.subject?.trim() && !c.body?.trim()) return 'Asunto y cuerpo vacíos';
      if (!c.subject?.trim()) return 'Asunto vacío';
      return 'Cuerpo vacío';
    }
    if (nodo.type === 'whatsapp') {
      const c = this.whatsappConfig(nodo);
      if (c.tipo === 'texto')    return 'Mensaje vacío';
      if (c.tipo === 'template') return 'Nombre de template vacío';
      if (c.tipo === 'botones')  return 'Botones incompletos';
      if (c.tipo === 'lista')    return 'Lista incompleta';
      if (c.tipo === 'media')     return 'URL de media vacía';
      if (c.tipo === 'ticket')   return 'Tipo de ticket no definido';
      if (c.tipo === 'condicion') return 'Condición sin configurar';
    }
    if (nodo.type === 'segment') return 'Sin filtros configurados';
    return '';
  }

  etiquetaNodo(id: string): string {
    const nodo = this.nodos().find(n => n.id === id);
    if (!nodo) return id;
    if (nodo.name) return nodo.name;
    if (nodo.type === 'segment')  return 'Segmento';
    if (nodo.type === 'sms')      return `SMS "${this.truncar(this.smsConfig(nodo).message)}"`;
    if (nodo.type === 'email')    return `Email "${this.truncar(this.emailConfig(nodo).subject)}"`;
    if (nodo.type === 'whatsapp') {
      const c = this.whatsappConfig(nodo);
      return `WP "${this.truncar(c.tipo === 'texto' ? c.mensaje : c.templateNombre)}"`;
    }
    return id;
  }

  eliminarArista(source: string, target: string, condicion?: string): void {
    this.aristas.update(as => as.filter(a =>
      !(a.source === source && a.target === target && a.condicion === condicion)
    ));
  }

  eliminarNodoActivo(): void {
    const activo = this.nodoActivo();
    if (!activo) return;
    // Quitar nodo y todas las aristas que lo involucran
    this.nodos.update(ns => ns.filter(n => n.id !== activo.id));
    this.aristas.update(as => as.filter(
      a => a.source !== activo.id && a.target !== activo.id,
    ));
    this.nodoActivo.set(null);
    this.audiencia.set(null);
  }

  eliminarConexionesSeleccionadas(): void {
    const ids = [...this.conexionesSeleccionadas()];
    this.conexionesSeleccionadas.set([]);
    if (!ids.length) return;
    this.aristas.update(as => as.filter(a => {
      const source = a.condicion
        ? `${a.source}__${a.condicion}__out`
        : `${a.source}_out`;
      const target = `${a.target}_in`;
      return !ids.some(id => id.includes(source) && id.includes(target));
    }));
  }

  // Inserta un token {{variable}} en la posición actual del cursor del textarea
  insertarVariable(token: string): void {
    const textarea = document.querySelector<HTMLTextAreaElement>('.sms-textarea');
    if (!textarea) {
      this.actualizarMensaje((this.smsConfig(this.nodoActivo()!).message ?? '') + token);
      return;
    }
    const inicio  = textarea.selectionStart ?? 0;
    const fin     = textarea.selectionEnd   ?? 0;
    const actual  = textarea.value;
    const nuevo   = actual.slice(0, inicio) + token + actual.slice(fin);
    this.actualizarMensaje(nuevo);
    // Restaurar foco y posición del cursor
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = inicio + token.length;
      textarea.setSelectionRange(pos, pos);
    });
  }

  // Resuelve las variables usando el primer contacto de la audiencia (si existe)
  // o usando los valores de ejemplo del modelo
  previewMensaje(mensaje: string): string {
    const audiencia = this.audiencia();
    const contacto  = audiencia?.contactos?.[0] as Contact | undefined;
    return contacto
      ? resolverVariables(mensaje, contacto)
      : resolverVariablesEjemplo(mensaje);
  }

  exportarCanvas(): void {
    const camp = this.campania();
    if (!camp) return;
    const payload = {
      version: '1.0',
      nombre: camp.name,
      descripcion: camp.description,
      exportado: new Date().toISOString(),
      canvas: {
        nodes: this.nodos().map(n => ({
          ...n,
          x: this.posiciones.get(n.id)?.x ?? n.x,
          y: this.posiciones.get(n.id)?.y ?? n.y,
        })),
        edges: this.aristas(),
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `campaña-${camp.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async guardarNombreCamp(nombre: string, descripcion = '', locale?: string): Promise<void> {
    this.editandoNombre.set(false);
    const camp = this.campania();
    if (!camp || !nombre.trim()) return;
    try {
      const actualizada = await this.campañaRepo.actualizar(camp.id, {
        name: nombre.trim(),
        description: descripcion.trim() || undefined,
        locale: locale ?? camp.locale,
      });
      this.campania.set(actualizada);
    } catch {
      this.error.set('Error al actualizar la campaña');
    }
  }

  async toggleEstado(): Promise<void> {
    const camp = this.campania();
    if (!camp) return;
    this.cambiandoEstado.set(true);
    this.error.set(null);
    try {
      const nuevoEstado = camp.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
      const actualizada = await this.campañaRepo.actualizar(camp.id, { status: nuevoEstado });
      this.campania.set(actualizada);
      this.exito.set(`Campaña ${nuevoEstado === 'ACTIVE' ? 'activada' : 'pausada a borrador'}`);
      setTimeout(() => this.exito.set(null), 3000);
    } catch {
      this.error.set('Error al cambiar el estado de la campaña');
    } finally {
      this.cambiandoEstado.set(false);
    }
  }

  volver(): void {
    this.router.navigate(['/campaigns']);
  }

  iniciarResize(event: MouseEvent, panel: HTMLElement): void {
    event.preventDefault();
    const startX   = event.clientX;
    const startW   = panel.offsetWidth;
    const onMove   = (e: MouseEvent) => {
      const delta = startX - e.clientX;
      const w     = Math.max(280, Math.min(600, startW + delta));
      panel.style.width = `${w}px`;
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  segmentConfig(nodo: CanvasNode): SegmentNodeConfig {
    return (nodo.config ?? { filters: { op: 'AND', conditions: [] } }) as SegmentNodeConfig;
  }

  smsConfig(nodo: CanvasNode): SmsNodeConfig {
    return (nodo.config ?? { message: '' }) as SmsNodeConfig;
  }

  emailConfig(nodo: CanvasNode): EmailNodeConfig {
    return (nodo.config ?? { subject: '', body: '' }) as EmailNodeConfig;
  }

  whatsappConfig(nodo: CanvasNode): WhatsappNodeConfig {
    return (nodo.config ?? { tipo: 'texto', mensaje: '' }) as WhatsappNodeConfig;
  }

  actualizarTipoWp(tipo: WhatsappTipo): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'whatsapp') return;
    const base = this.whatsappConfig(activo);

    // Limpiar edges condicionales si se abandona botones/lista
    if ((base.tipo === 'botones' || base.tipo === 'lista') && tipo !== base.tipo) {
      this.aristas.update(as => as.filter(a => !(a.source === activo.id && a.condicion)));
    }

    const nuevo: WhatsappNodeConfig = { tipo, mensaje: base.mensaje };
    if (tipo === 'botones') {
      nuevo.botones = base.botones?.length
        ? base.botones
        : [{ id: 'btn_1', texto: '' }, { id: 'btn_2', texto: '' }];
    }
    if (tipo === 'lista') {
      nuevo.secciones = base.secciones?.length
        ? base.secciones
        : [{ titulo: '', opciones: [{ id: `opt_${Date.now()}`, titulo: '' }] }];
    }
    if (tipo === 'template') {
      nuevo.templateNombre  = base.templateNombre;
      nuevo.templateParams  = base.templateParams;
    }
    if (tipo === 'media') nuevo.mediaType = base.mediaType ?? 'image';
    if (tipo === 'ticket') nuevo.ticketTipo = base.ticketTipo;
    this.actualizarConfig(nuevo);
  }

  // --- Botones ---
  agregarBoton(): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'whatsapp') return;
    const c = this.whatsappConfig(activo);
    const botones = [...(c.botones ?? [])];
    if (botones.length >= 3) return;
    botones.push({ id: `btn_${botones.length + 1}`, texto: '' });
    this.actualizarConfigWp({ botones });
  }

  eliminarBoton(idx: number): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'whatsapp') return;
    const c = this.whatsappConfig(activo);
    const eliminado = c.botones?.[idx];
    const botones = (c.botones ?? []).filter((_, i) => i !== idx);
    this.actualizarConfigWp({ botones });
    // Quitar arista condicional del botón eliminado
    if (eliminado) {
      this.aristas.update(as => as.filter(a => !(a.source === activo.id && a.condicion === eliminado.id)));
    }
  }

  actualizarTextoBoton(idx: number, texto: string): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'whatsapp') return;
    const c = this.whatsappConfig(activo);
    const botones = (c.botones ?? []).map((b, i) => i === idx ? { ...b, texto } : b);
    this.actualizarConfigWp({ botones });
  }

  // --- Lista ---
  agregarSeccion(): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'whatsapp') return;
    const c = this.whatsappConfig(activo);
    const secciones = [...(c.secciones ?? []), { titulo: '', opciones: [{ id: `opt_${Date.now()}`, titulo: '' }] }];
    this.actualizarConfigWp({ secciones });
  }

  agregarOpcion(secIdx: number): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'whatsapp') return;
    const c = this.whatsappConfig(activo);
    const secciones: WhatsappSeccion[] = (c.secciones ?? []).map((s, i) =>
      i === secIdx
        ? { ...s, opciones: [...s.opciones, { id: `opt_${Date.now()}`, titulo: '' }] }
        : s
    );
    this.actualizarConfigWp({ secciones });
  }

  eliminarOpcion(secIdx: number, optIdx: number): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'whatsapp') return;
    const c = this.whatsappConfig(activo);
    const eliminada = c.secciones?.[secIdx]?.opciones?.[optIdx];
    const secciones: WhatsappSeccion[] = (c.secciones ?? []).map((s, i) =>
      i === secIdx ? { ...s, opciones: s.opciones.filter((_, j) => j !== optIdx) } : s
    );
    this.actualizarConfigWp({ secciones });
    // Quitar arista condicional de la opción eliminada
    if (eliminada) {
      this.aristas.update(as => as.filter(a => !(a.source === activo.id && a.condicion === eliminada.id)));
    }
  }

  actualizarTituloSeccion(secIdx: number, titulo: string): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'whatsapp') return;
    const c = this.whatsappConfig(activo);
    const secciones: WhatsappSeccion[] = (c.secciones ?? []).map((s, i) => i === secIdx ? { ...s, titulo } : s);
    this.actualizarConfigWp({ secciones });
  }

  actualizarTituloOpcion(secIdx: number, optIdx: number, titulo: string): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'whatsapp') return;
    const c = this.whatsappConfig(activo);
    const secciones: WhatsappSeccion[] = (c.secciones ?? []).map((s, i) =>
      i === secIdx
        ? { ...s, opciones: s.opciones.map((o, j) => j === optIdx ? { ...o, titulo } : o) }
        : s
    );
    this.actualizarConfigWp({ secciones });
  }

  private actualizarConfigWp(parcial: Partial<WhatsappNodeConfig>): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'whatsapp') return;
    this.actualizarConfig({ ...this.whatsappConfig(activo), ...parcial } as WhatsappNodeConfig);
  }

  actualizarConfigWpDirecto(campo: keyof WhatsappNodeConfig, valor: unknown): void {
    this.actualizarConfigWp({ [campo]: valor } as Partial<WhatsappNodeConfig>);
  }

  actualizarMensajeWp(mensaje: string): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'whatsapp') return;
    this.actualizarConfig({ ...this.whatsappConfig(activo), mensaje } as WhatsappNodeConfig);
  }

  actualizarTemplateNombre(templateNombre: string): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'whatsapp') return;
    this.actualizarConfig({ ...this.whatsappConfig(activo), templateNombre } as WhatsappNodeConfig);
  }

  actualizarTemplateParams(raw: string): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'whatsapp') return;
    const templateParams = raw.split('\n').map(p => p.trim()).filter(Boolean);
    this.actualizarConfig({ ...this.whatsappConfig(activo), templateParams } as WhatsappNodeConfig);
  }

  actualizarAsunto(asunto: string): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'email') return;
    this.actualizarConfig({ ...this.emailConfig(activo), subject: asunto } as EmailNodeConfig);
  }

  actualizarCuerpo(cuerpo: string): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'email') return;
    this.actualizarConfig({ ...this.emailConfig(activo), body: cuerpo } as EmailNodeConfig);
  }

  get contadorSms(): string {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'sms') return '';
    const msg     = (activo.config as SmsNodeConfig).message ?? '';
    const unicode = /[^\x00-\x7F]/.test(msg);
    return `${msg.length}/${unicode ? 70 : 160} ${unicode ? '(Unicode)' : '(GSM)'}`;
  }

  truncar(msg: string | undefined): string {
    if (!msg) return 'Sin mensaje';
    return msg.length > 30 ? msg.slice(0, 30) + '...' : msg;
  }

  get superaLimiteSms(): boolean {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'sms') return false;
    const msg = (activo.config as SmsNodeConfig).message ?? '';
    return msg.length > (/[^\x00-\x7F]/.test(msg) ? 70 : 160);
  }
}
