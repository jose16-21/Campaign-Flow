import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  signal,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FFlowModule,
  FCreateNodeEvent,
  FCreateConnectionEvent,
  FSelectionChangeEvent,
  FCanvasComponent,
  FZoomDirective,
  EFZoomDirection,
  EFResizeHandleType,
} from '@foblex/flow';
import { GetCampaignUseCase }     from '../../../application/use-cases/campaigns/get-campaign.use-case';
import { SaveCanvasUseCase }      from '../../../application/use-cases/campaigns/save-canvas.use-case';
import { CAMPAIGN_REPOSITORY }    from '../../../infrastructure/tokens/repository.tokens';
import { CanvasStateService }     from './services/canvas-state.service';
import { NodeConfigPanelComponent } from './components/node-config-panel/node-config-panel.component';
import type {
  Campaign,
  CanvasNode,
  WhatsappNodeConfig,
  WhatsappTipo,
  AnnotationNodeConfig,
  SegmentNodeConfig,
  SmsNodeConfig,
  EmailNodeConfig,
} from '../../../domain/models/campaign.model';
import { TIPOS_ACCION, ICONO_NODO, LABEL_NODO, LOCALES_DISPONIBLES } from '../../../domain/models/campaign.model';

type PaletteItem = {
  type: 'segment' | 'sms' | 'email' | 'whatsapp' | 'annotation';
  label: string;
  icon: string;
  wpTipo?: WhatsappTipo;
  section?: 'base' | 'wp' | 'canvas';
};

const PALETA: PaletteItem[] = [
  // Nodos base
  { type: 'segment',    label: 'Segmento',     icon: ICONO_NODO.segment, section: 'base' },
  { type: 'sms',        label: 'SMS',          icon: ICONO_NODO.sms,     section: 'base' },
  { type: 'email',      label: 'Email',        icon: ICONO_NODO.email,   section: 'base' },
  // Anotaciones y marcos
  { type: 'annotation', label: 'Nota',         icon: '📝', section: 'canvas' },
  // Nodos WhatsApp
  { type: 'whatsapp', label: 'WP Texto',     icon: '💬', wpTipo: 'texto',     section: 'wp' },
  { type: 'whatsapp', label: 'WP Botones',   icon: '🔘', wpTipo: 'botones',   section: 'wp' },
  { type: 'whatsapp', label: 'WP Lista',     icon: '📜', wpTipo: 'lista',     section: 'wp' },
  { type: 'whatsapp', label: 'WP Media',     icon: '🖼',  wpTipo: 'media',     section: 'wp' },
  { type: 'whatsapp', label: 'WP Template',  icon: '📋', wpTipo: 'template',  section: 'wp' },
  { type: 'whatsapp', label: 'WP Condición', icon: '⬦',  wpTipo: 'condicion', section: 'wp' },
  { type: 'whatsapp', label: 'WP Ticket',    icon: '🎫', wpTipo: 'ticket',    section: 'wp' },
];

const COLORES_MARCO = ['#4a90e2', '#1a8a47', '#e57c00', '#7c3aed', '#e53935', '#555'];
const COLORES_NOTA  = ['#fef9c3', '#dcfce7', '#dbeafe', '#fce7f3'];

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
  standalone: true,
  imports: [FFlowModule, NodeConfigPanelComponent],
  templateUrl: './campaign-editor.component.html',
  styleUrl: './campaign-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CanvasStateService],
})
export class CampaignEditorComponent implements OnInit {
  @ViewChild(FCanvasComponent) private fCanvas!: FCanvasComponent;
  @ViewChild(FZoomDirective)   private fZoom!: FZoomDirective;

  private readonly route       = inject(ActivatedRoute);
  private readonly router      = inject(Router);
  private readonly getUseCase  = inject(GetCampaignUseCase);
  private readonly saveUseCase = inject(SaveCanvasUseCase);
  private readonly campañaRepo = inject(CAMPAIGN_REPOSITORY);
  readonly state               = inject(CanvasStateService);

  // ── Signals kept in editor ────────────────────────────────
  readonly campania        = signal<Campaign | null>(null);
  readonly guardando       = signal(false);
  readonly activando       = signal(false);
  readonly cambiandoEstado = signal(false);
  readonly editandoNombre  = signal(false);
  readonly error           = signal<string | null>(null);
  readonly exito           = signal<string | null>(null);

  // ── Constants ──────────────────────────────────────────────
  readonly paleta       = PALETA;
  readonly paletaBase   = PALETA.filter(i => i.section === 'base');
  readonly paletaCanvas = PALETA.filter(i => i.section === 'canvas');
  readonly paletaWp     = PALETA.filter(i => i.section === 'wp');
  readonly iconoNodo    = ICONO_NODO;
  readonly labelNodo    = LABEL_NODO;
  readonly locales      = LOCALES_DISPONIBLES;
  readonly wpTipoMeta   = WP_TIPO_META;
  readonly resizeHandleType = EFResizeHandleType;
  readonly coloresMarco     = COLORES_MARCO;
  readonly coloresNota      = COLORES_NOTA;

  // ── Position map (no signal — avoids extra CD during drag) ──
  private readonly posiciones = new Map<string, { x: number; y: number }>();

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    try {
      const camp = await this.getUseCase.ejecutar(id);
      this.campania.set(camp);
      if (camp.canvas) {
        const nodos = camp.canvas.nodes ?? [];
        nodos.forEach(n => this.posiciones.set(n.id, { x: n.x, y: n.y }));
        this.state.initialize(camp.canvas);

        // nextId from max existing "node-N" index
        const maxIdx = nodos.reduce((max, n) => {
          const m = n.id.match(/^node-(\d+)$/);
          return m ? Math.max(max, parseInt(m[1], 10)) : max;
        }, 0);
        this.state.resetearNextId(maxIdx);

        const maxGIdx = (camp.canvas.groups ?? []).reduce((max, g) => {
          const m = g.id.match(/^group-(\d+)$/);
          return m ? Math.max(max, parseInt(m[1], 10)) : max;
        }, 0);
        this.state.resetearNextGroupId(maxGIdx);
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
    const id  = this.state.generarIdNodo();
    const pos = evento.dropPosition ?? { x: 200, y: 200 };
    let config: AnnotationNodeConfig | SegmentNodeConfig | SmsNodeConfig | EmailNodeConfig | WhatsappNodeConfig;
    if (evento.data.type === 'annotation') {
      config = { text: '', color: '#fef9c3' };
    } else if (evento.data.type === 'segment') {
      config = { filters: { op: 'AND', conditions: [] } };
    } else if (evento.data.type === 'email') {
      config = { subject: '', body: '' };
    } else if (evento.data.type === 'whatsapp') {
      config = this.buildWpConfig(evento.data.wpTipo ?? 'texto');
    } else {
      config = { message: '' };
    }
    this.posiciones.set(id, pos);
    this.state.nodos.update(n => [...n, { id, type: evento.data.type, x: pos.x, y: pos.y, config }]);
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
    if (tipo === 'condicion') {
      base.condicionCampo = '';
      base.condicionOperador = 'eq';
      base.condicionValor = '';
    }
    return base;
  }

  onPosicionCambiada(nodeId: string, pos: { x: number; y: number }): void {
    if (!nodeId || !pos || typeof pos.x !== 'number' || typeof pos.y !== 'number'
        || isNaN(pos.x) || isNaN(pos.y)) return;
    this.posiciones.set(nodeId, pos);
  }

  onCrearConexion(evento: FCreateConnectionEvent): void {
    if (!evento.targetId) return;

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

    const sourceNodo = this.state.nodos().find(n => n.id === sourceNodeId);
    const targetNodo = this.state.nodos().find(n => n.id === targetNodeId);
    if (sourceNodo && TIPOS_ACCION.includes(sourceNodo.type) && targetNodo?.type === 'segment') {
      if (!condicion) {
        const arista = { source: targetNodeId, target: sourceNodeId };
        if (!this.state.aristas().some(a => a.source === arista.source && a.target === arista.target && !a.condicion)) {
          this.state.aristas.update(a => [...a, arista]);
        }
        return;
      }
    }

    let etiqueta: string | undefined;
    if (condicion && sourceNodo?.type === 'whatsapp') {
      const c = this.state.whatsappConfig(sourceNodo);
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

    const existe = this.state.aristas().some(
      a => a.source === sourceNodeId && a.target === targetNodeId && a.condicion === condicion,
    );
    if (!existe) {
      this.state.aristas.update(a => [
        ...a,
        { source: sourceNodeId, target: targetNodeId, condicion, etiqueta },
      ]);
    }
  }

  onSeleccionCambiada(evento: FSelectionChangeEvent): void {
    if (evento.connectionIds?.length) {
      this.state.conexionesSeleccionadas.set(evento.connectionIds);
    } else if (evento.nodeIds?.length) {
      this.state.conexionesSeleccionadas.set([]);
    }
  }

  onFormClick(nodo: CanvasNode, event: MouseEvent): void {
    if (nodo.type === 'segment') {
      this.state.seleccionarNodo(nodo);
    } else {
      event.stopPropagation();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onTeclaPresionada(event: KeyboardEvent): void {
    if (event.key !== 'Delete' && event.key !== 'Backspace') return;
    const tag = (event.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (this.state.conexionesSeleccionadas().length > 0) {
      event.preventDefault();
      this.state.eliminarConexionesSeleccionadas();
    } else if (this.state.nodoActivo()) {
      event.preventDefault();
      this.state.eliminarNodoActivo();
    }
  }

  async guardar(): Promise<void> {
    const camp = this.campania();
    if (!camp) return;

    const errorGrafo = this.state.validarReglasGrafo();
    if (errorGrafo) { this.error.set(errorGrafo); return; }

    this.guardando.set(true);
    this.error.set(null);
    try {
      const nodosActualizados = this.state.nodos()
        .filter(n => n.id && n.config)
        .map(n => {
          const pos = this.posiciones.get(n.id);
          return (pos && !isNaN(pos.x) && !isNaN(pos.y))
            ? { ...n, x: pos.x, y: pos.y }
            : n;
        });
      await this.saveUseCase.ejecutar(camp.id, {
        nodes: nodosActualizados,
        edges: this.state.aristas(),
        groups: this.state.grupos(),
      });
      this.exito.set('Canvas guardado correctamente');
      setTimeout(() => this.exito.set(null), 3000);
    } catch {
      this.error.set('Error al guardar el canvas');
    } finally {
      this.guardando.set(false);
    }
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

  exportarCanvas(): void {
    const camp = this.campania();
    if (!camp) return;
    const payload = {
      version: '1.0',
      nombre: camp.name,
      descripcion: camp.description,
      exportado: new Date().toISOString(),
      canvas: {
        nodes: this.state.nodos().map(n => ({
          ...n,
          x: this.posiciones.get(n.id)?.x ?? n.x,
          y: this.posiciones.get(n.id)?.y ?? n.y,
        })),
        edges: this.state.aristas(),
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

  volver(): void {
    this.router.navigate(['/campaigns']);
  }

  ajustarVista(): void {
    this.fCanvas?.fitToScreen({ x: 40, y: 40 }, true);
  }

  zoomIn(): void {
    this.fZoom?.setZoom({ x: 0, y: 0 }, 0.1, EFZoomDirection.ZOOM_IN, true);
  }

  zoomOut(): void {
    this.fZoom?.setZoom({ x: 0, y: 0 }, 0.1, EFZoomDirection.ZOOM_OUT, true);
  }

  iniciarResize(event: MouseEvent, panel: HTMLElement): void {
    event.preventDefault();
    const startX = event.clientX;
    const startW = panel.offsetWidth;
    const onMove = (e: MouseEvent) => {
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
}
