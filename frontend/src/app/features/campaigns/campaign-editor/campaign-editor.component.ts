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
} from '../../../domain/models/campaign.model';
import { TIPOS_ACCION } from '../../../domain/models/campaign.model';
import type { FilterGroup }    from '../../../domain/models/filter-tree.model';
import type { AudienceResult } from '../../../domain/models/audience.model';
import type { Contact }        from '../../../domain/models/contact.model';
import {
  SMS_VARIABLES,
  resolverVariables,
  resolverVariablesEjemplo,
} from '../../../domain/models/sms-variables.model';

type PaletteItem = { type: 'segment' | 'sms' | 'email'; label: string; icon: string };

const PALETA: PaletteItem[] = [
  { type: 'segment', label: 'Segmento', icon: 'S' },
  { type: 'sms',     label: 'SMS',      icon: 'M' },
  { type: 'email',   label: 'Email',    icon: 'E' },
];

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
  readonly cambiandoEstado   = signal(false);
  readonly editandoNombre    = signal(false);
  readonly error             = signal<string | null>(null);
  readonly exito             = signal<string | null>(null);
  readonly nodosConError          = signal<Set<string>>(new Set());
  readonly conexionesSeleccionadas = signal<string[]>([]);
  readonly audiencia         = signal<AudienceResult | null>(null);
  readonly cargandoAudiencia = signal(false);

  readonly paleta              = PALETA;
  readonly variablesDisponibles = SMS_VARIABLES;
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
    const config: SegmentNodeConfig | SmsNodeConfig | EmailNodeConfig =
      evento.data.type === 'segment'
        ? { filters: { op: 'AND', conditions: [] } }
        : evento.data.type === 'email'
          ? { subject: '', body: '' }
          : { message: '' };

    this.posiciones.set(id, pos);
    this.nodos.update(n => [
      ...n,
      { id, type: evento.data.type, x: pos.x, y: pos.y, config },
    ]);
  }

  // Solo actualiza el Map plano — sin signal → sin change detection → sin resetear posición
  onPosicionCambiada(nodeId: string, pos: { x: number; y: number }): void {
    if (!nodeId || !pos || typeof pos.x !== 'number' || typeof pos.y !== 'number'
        || isNaN(pos.x) || isNaN(pos.y)) return;
    this.posiciones.set(nodeId, pos);
  }

  onCrearConexion(evento: FCreateConnectionEvent): void {
    if (!evento.targetId) return;
    let sourceId = evento.sourceId.replace('_out', '');
    let targetId = evento.targetId.replace('_in', '');
    if (sourceId === targetId) return;

    // Auto-corregir dirección invertida: si el usuario arrastró acción → Segmento,
    // se invierte para que siempre quede Segmento → acción
    const sourceNodo = this.nodos().find(n => n.id === sourceId);
    const targetNodo = this.nodos().find(n => n.id === targetId);
    if (sourceNodo && TIPOS_ACCION.includes(sourceNodo.type) && targetNodo?.type === 'segment') {
      [sourceId, targetId] = [targetId, sourceId];
    }

    const existe = this.aristas().some(
      a => a.source === sourceId && a.target === targetId,
    );
    if (!existe) {
      this.aristas.update(a => [...a, { source: sourceId, target: targetId }]);
    }
  }

  seleccionarNodo(nodo: CanvasNode): void {
    this.nodoActivo.set(this.nodoActivo()?.id === nodo.id ? null : nodo);
    this.audiencia.set(null);
    this.conexionesSeleccionadas.set([]); // limpiar selección de conexión al abrir panel
  }

  actualizarConfig(config: SegmentNodeConfig | SmsNodeConfig | EmailNodeConfig): void {
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
      return 'El canvas está vacío. Agrega al menos un Segmento y una acción (SMS o Email) conectados.';
    }

    const tieneSegmento = nodos.some(n => n.type === 'segment');
    const tieneAccion   = nodos.some(n => TIPOS_ACCION.includes(n.type));

    if (!tieneSegmento || !tieneAccion) {
      this.nodosConError.set(new Set(nodos.map(n => n.id)));
      return 'El canvas necesita al menos un nodo Segmento y una acción (SMS o Email) conectados para guardar.';
    }

    // Cada nodo de acción debe tener un Segmento como origen
    const accionesDesconectadas = nodos
      .filter(n => TIPOS_ACCION.includes(n.type))
      .filter(accion => !aristas.some(a => {
        if (a.target !== accion.id) return false;
        const origen = nodos.find(n => n.id === a.source);
        return origen?.type === 'segment';
      }));

    if (accionesDesconectadas.length > 0) {
      this.nodosConError.set(new Set(accionesDesconectadas.map(n => n.id)));
      const nombres = accionesDesconectadas.map(n => `"${this.etiquetaAccion(n)}"`).join(', ');
      return `Nodo(s) de acción sin Segmento conectado: ${nombres}. Conecta un Segmento como origen antes de guardar.`;
    }

    // Cada Segmento debe tener al menos una acción como destino
    const segmentosDesconectados = nodos
      .filter(n => n.type === 'segment')
      .filter(seg => !aristas.some(a => {
        if (a.source !== seg.id) return false;
        const destino = nodos.find(n => n.id === a.target);
        return destino && TIPOS_ACCION.includes(destino.type);
      }));

    if (segmentosDesconectados.length > 0) {
      this.nodosConError.set(new Set(segmentosDesconectados.map(n => n.id)));
      return 'Nodo(s) Segmento sin acción conectada como destino. Conecta un SMS o Email a cada Segmento.';
    }

    this.nodosConError.set(new Set());
    return null;
  }

  private etiquetaAccion(nodo: CanvasNode): string {
    if (nodo.name) return nodo.name;
    if (nodo.type === 'sms') return this.truncar(this.smsConfig(nodo).message);
    if (nodo.type === 'email') return this.emailConfig(nodo).subject || 'Sin asunto';
    return nodo.id;
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
    if (nodo.type === 'segment') return 'Sin filtros configurados';
    return '';
  }

  etiquetaNodo(id: string): string {
    const nodo = this.nodos().find(n => n.id === id);
    if (!nodo) return id;
    if (nodo.name) return nodo.name;
    if (nodo.type === 'segment') return 'Segmento';
    if (nodo.type === 'sms') return `SMS "${this.truncar(this.smsConfig(nodo).message)}"`;
    if (nodo.type === 'email') return `Email "${this.truncar(this.emailConfig(nodo).subject)}"`;
    return id;
  }

  eliminarArista(source: string, target: string): void {
    this.aristas.update(as => as.filter(a => !(a.source === source && a.target === target)));
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
    const ids = [...this.conexionesSeleccionadas()]; // copia antes de limpiar
    this.conexionesSeleccionadas.set([]);
    if (!ids.length) return;
    console.log('[canvas] eliminar conexiones, ids:', ids);
    // El connectionId de foblex incluye sourceId+targetId concatenados
    this.aristas.update(as => as.filter(a => {
      const source = a.source + '_out';
      const target = a.target + '_in';
      const match = ids.some(id => id.includes(source) && id.includes(target));
      if (match) console.log('[canvas] eliminando arista:', a);
      return !match;
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

  async guardarNombreCamp(nombre: string, descripcion = ''): Promise<void> {
    this.editandoNombre.set(false);
    const camp = this.campania();
    if (!camp || !nombre.trim()) return;
    try {
      const actualizada = await this.campañaRepo.actualizar(camp.id, {
        name: nombre.trim(),
        description: descripcion.trim() || undefined,
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
